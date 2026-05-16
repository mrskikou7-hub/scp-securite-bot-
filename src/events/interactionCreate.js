const { EmbedBuilder } = require('discord.js');
const { getAgent, setAgent } = require('../utils/db');
const { buildLeaderboardEmbed, buildServiceButtons, formatDuration } = require('../utils/leaderboard');

const IN_SERVICE_ROLE_ID  = process.env.IN_SERVICE_ROLE_ID  || null;
const PDS_FDS_ROLE_ID     = process.env.PDS_FDS_ROLE_ID     || null;
// Salon autorisé pour les boutons PDS/FDS (et /setup-service)
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

    // ─── SLASH COMMANDS ──────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      // Vérification du salon pour /setup-service
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

    // ─── BUTTONS ─────────────────────────────────────────────────────
    if (!interaction.isButton()) return;

    // Vérification du salon pour les boutons PDS/FDS
    if (SERVICE_CHANNEL_ID && interaction.channelId !== SERVICE_CHANNEL_ID) {
      return interaction.reply({
        content: `🚫 Les prises/fins de service ne peuvent se faire que dans <#${SERVICE_CHANNEL_ID}>.`,
        ephemeral: true
      });
    }

    // Vérification du rôle PDS/FDS
    if (PDS_FDS_ROLE_ID && !interaction.member.roles.cache.has(PDS_FDS_ROLE_ID)) {
      return interaction.reply({
        content: '🚫 Tu n\'as pas le rôle requis pour effectuer une prise ou fin de service.',
        ephemeral: true
      });
    }

    const userId = interaction.user.id;
    const now = Date.now();
    const agent = getAgent(userId);

    // ── PRISE DE SERVICE ──
    if (interaction.customId === 'prise_service') {
      if (agent.inService) {
        return interaction.reply({
          content: '⚠️ Tu es **déjà en service** ! Utilise le bouton **Fin de Service** pour terminer.',
          ephemeral: true
        });
      }

      setAgent(userId, { inService: true, startTime: now, username: interaction.user.username });

      if (IN_SERVICE_ROLE_ID) {
        try { await interaction.member.roles.add(IN_SERVICE_ROLE_ID); }
        catch (e) { console.warn('Impossible d\'ajouter le rôle:', e.message); }
      }

      const embed = new EmbedBuilder()
        .setTitle('🟢 Prise de Service')
        .setDescription(`Agent **${interaction.user.username}** a pris son service.`)
        .addFields(
          { name: '🕐 Heure de début', value: `<t:${Math.floor(now / 1000)}:T>`, inline: true },
          { name: '⏱️ Total accumulé', value: `\`${formatDuration(agent.totalMs)}\``, inline: true }
        )
        .setColor(0x00ff88)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: 'Fondation SCP • Département de Sécurité' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      await updateLeaderboardMessage(interaction.message);
      return;
    }

    // ── FIN DE SERVICE ──
    if (interaction.customId === 'fin_service') {
      if (!agent.inService) {
        return interaction.reply({
          content: '⚠️ Tu n\'es **pas en service** actuellement !',
          ephemeral: true
        });
      }

      const sessionMs = now - (agent.startTime || now);
      const newTotal = (agent.totalMs || 0) + sessionMs;

      setAgent(userId, { inService: false, startTime: null, totalMs: newTotal, username: interaction.user.username });

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
