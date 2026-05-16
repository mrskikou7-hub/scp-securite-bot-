const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getAgent, setAgent } = require('../utils/db');
const { buildLeaderboardEmbed, buildServiceButtons, formatDuration } = require('../utils/leaderboard');

const IN_SERVICE_ROLE_ID  = process.env.IN_SERVICE_ROLE_ID  || null;
const PDS_FDS_ROLE_ID     = process.env.PDS_FDS_ROLE_ID     || null;
const SERVICE_CHANNEL_ID  = process.env.SERVICE_CHANNEL_ID  || null;

async function updateLeaderboardMessage(message) {
  try {
    const embed = buildLeaderboardEmbed();
    const buttons = buildServiceButtons();
    await message.edit({ embeds: [embed], components: [buttons] });
  } catch (err) {
    console.error('Impossible de mettre à jour le leaderboard:', err);
  }
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    // SLASH COMMANDS
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'setup-service') {
        if (SERVICE_CHANNEL_ID && interaction.channelId !== SERVICE_CHANNEL_ID) {
          return interaction.reply({
            content: `🚫 Cette commande ne peut être utilisée que dans <#${SERVICE_CHANNEL_ID}>.`,
            ephemeral: true
          });
        }
      }
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(err);
        const msg = { content: '❌ Une erreur est survenue.', ephemeral: true };
        if (interaction.deferred) await interaction.editReply(msg);
        else await interaction.reply(msg);
      }
      return;
    }

    // MODAL SUBMIT (lien d'appel)
    if (interaction.isModalSubmit() && interaction.customId === 'modal_prise_service') {
      const lienAppel = interaction.fields.getTextInputValue('lien_appel').trim();
      const userId = interaction.user.id;
      const now = Date.now();
      const agent = getAgent(userId);

      // Vérification que c'est bien un lien valide (http:// ou https://)
      let urlValide = false;
      try {
        const url = new URL(lienAppel);
        urlValide = url.protocol === 'http:' || url.protocol === 'https:';
      } catch (_) {
        urlValide = false;
      }

      if (!urlValide) {
        return interaction.reply({
          content: '🚫 **Lien invalide !** Tu dois entrer le lien de l'appel AIT, pas un mot ou une phrase.\n> Exemple : `https://discord.com/channels/`',
          ephemeral: true
        });
      }

      setAgent(userId, { inService: true, startTime: now, username: interaction.user.username, lienAppel });

      if (IN_SERVICE_ROLE_ID) {
        try { await interaction.member.roles.add(IN_SERVICE_ROLE_ID); }
        catch (e) { console.warn('Impossible d\'ajouter le rôle:', e.message); }
      }

      const embed = new EmbedBuilder()
        .setTitle('🟢 Prise de Service')
        .setDescription(`Agent **${interaction.user.username}** a pris son service.`)
        .addFields(
          { name: '🕐 Heure de début', value: `<t:${Math.floor(now / 1000)}:T>`, inline: true },
          { name: '⏱️ Total accumulé', value: `\`${formatDuration(agent.totalMs)}\``, inline: true },
          { name: '📋 Lien d\'appel d\'intervention', value: lienAppel, inline: false }
        )
        .setColor(0x00ff88)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: 'Fondation SCP • Département de Sécurité' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

      const channel = interaction.channel;
      const messages = await channel.messages.fetch({ limit: 20 });
      const leaderboardMsg = messages.find(m => m.author.bot && m.components.length > 0);
      if (leaderboardMsg) await updateLeaderboardMessage(leaderboardMsg);
      return;
    }

    // BUTTONS
    if (!interaction.isButton()) return;

    if (SERVICE_CHANNEL_ID && interaction.channelId !== SERVICE_CHANNEL_ID) {
      return interaction.reply({
        content: `🚫 Les prises/fins de service ne peuvent se faire que dans <#${SERVICE_CHANNEL_ID}>.`,
        ephemeral: true
      });
    }

    if (PDS_FDS_ROLE_ID && !interaction.member.roles.cache.has(PDS_FDS_ROLE_ID)) {
      return interaction.reply({
        content: '🚫 Tu n\'as pas le rôle requis pour effectuer une prise ou fin de service.',
        ephemeral: true
      });
    }

    const userId = interaction.user.id;
    const now = Date.now();
    const agent = getAgent(userId);

    // PRISE DE SERVICE → ouvre le modal
    if (interaction.customId === 'prise_service') {
      if (agent.inService) {
        return interaction.reply({
          content: '⚠️ Tu es **déjà en service** ! Utilise le bouton **Fin de Service** pour terminer.',
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId('modal_prise_service')
        .setTitle('🟢 Prise de Service — SCP Sécurité');

      const lienInput = new TextInputBuilder()
        .setCustomId('lien_appel')
        .setLabel('Lien d\'appel d\'intervention')
        .setPlaceholder('https://...')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(500);

      modal.addComponents(new ActionRowBuilder().addComponents(lienInput));
      await interaction.showModal(modal);
      return;
    }

    // FIN DE SERVICE
    if (interaction.customId === 'fin_service') {
      if (!agent.inService) {
        return interaction.reply({
          content: '⚠️ Tu n\'es **pas en service** actuellement !',
          ephemeral: true
        });
      }

      const sessionMs = now - (agent.startTime || now);
      const newTotal = (agent.totalMs || 0) + sessionMs;

      setAgent(userId, { inService: false, startTime: null, totalMs: newTotal, username: interaction.user.username, lienAppel: null });

      if (IN_SERVICE_ROLE_ID) {
        try { await interaction.member.roles.remove(IN_SERVICE_ROLE_ID); }
        catch (e) { console.warn('Impossible de retirer le rôle:', e.message); }
      }

      const embed = new EmbedBuilder()
        .setTitle('🔴 Fin de Service')
        .setDescription(`Agent **${interaction.user.username}** a terminé son service.`)
        .addFields(
          { name: '⏱️ Durée de la session', value: `\`${formatDuration(sessionMs)}\``, inline: true },
          { name: '📊 Total cumulé', value: `\`${formatDuration(newTotal)}\``, inline: true }
        )
        .setColor(0xff4444)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: 'Fondation SCP • Département de Sécurité' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      await updateLeaderboardMessage(interaction.message);
      return;
    }
  }
};
