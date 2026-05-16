const { SlashCommandBuilder } = require('discord.js');
const { getAgent } = require('../utils/db');
const { formatDuration } = require('../utils/leaderboard');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats-service')
    .setDescription('Affiche tes heures de service totales.')
    .addUserOption(opt =>
      opt.setName('agent').setDescription('Voir les stats d\'un autre agent (optionnel)')),

  async execute(interaction) {
    const target = interaction.options.getUser('agent') || interaction.user;
    const agent = getAgent(target.id);
    const now = Date.now();
    const currentSession = agent.inService && agent.startTime ? now - agent.startTime : 0;
    const total = (agent.totalMs || 0) + currentSession;

    const embed = new EmbedBuilder()
      .setTitle(`📊 Dossier Agent — ${target.username}`)
      .setColor(agent.inService ? 0x00ff88 : 0xff4444)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: 'Statut', value: agent.inService ? '🟢 En Service' : '🔴 Hors Service', inline: true },
        { name: 'Session actuelle', value: `\`${formatDuration(currentSession)}\``, inline: true },
        { name: 'Total des heures', value: `\`${formatDuration(total)}\``, inline: true }
      )
      .setFooter({ text: 'Fondation SCP • Département de Sécurité' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
