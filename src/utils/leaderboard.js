const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getAllAgents } = require('./db');

function formatDuration(ms) {
  if (!ms || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function buildLeaderboardEmbed() {
  const agents = getAllAgents();
  const now = Date.now();

  // Sort: in-service first, then by total hours
  const sorted = Object.entries(agents)
    .map(([id, data]) => {
      const currentSession = data.inService && data.startTime ? now - data.startTime : 0;
      const totalMs = (data.totalMs || 0) + currentSession;
      return { id, ...data, totalMs, currentSession };
    })
    .sort((a, b) => {
      if (a.inService && !b.inService) return -1;
      if (!a.inService && b.inService) return 1;
      return b.totalMs - a.totalMs;
    });

  const inServiceList = sorted.filter(a => a.inService);
  const offServiceList = sorted.filter(a => !a.inService && a.totalMs > 0);

  // Build in-service section
  let inServiceField = '';
  if (inServiceList.length === 0) {
    inServiceField = '*Aucun agent en service actuellement.*';
  } else {
    inServiceList.forEach((agent, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
      inServiceField += `${medal} <@${agent.id}> — Session: \`${formatDuration(agent.currentSession)}\` | Total: \`${formatDuration(agent.totalMs)}\`\n`;
    });
  }

  // Build total hours leaderboard
  let totalField = '';
  const allRanked = sorted.filter(a => a.totalMs > 0);
  if (allRanked.length === 0) {
    totalField = '*Aucune heure enregistrée.*';
  } else {
    allRanked.slice(0, 10).forEach((agent, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
      const status = agent.inService ? '🟢' : '🔴';
      totalField += `${medal} ${status} <@${agent.id}> — \`${formatDuration(agent.totalMs)}\`\n`;
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('🔐 Département de Sécurité — Tableau de Service')
    .setDescription('> *Fondation SCP — Unité de Sécurité Opérationnelle*\n\u200b')
    .setColor(0x1a1a2e)
    .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/SCP_Foundation_%28emblem%29.svg/240px-SCP_Foundation_%28emblem%29.svg.png')
    .addFields(
      {
        name: '🟢 Agents En Service',
        value: inServiceField,
        inline: false
      },
      {
        name: '\u200b',
        value: '\u200b',
        inline: false
      },
      {
        name: '🏆 Classement Total des Heures',
        value: totalField,
        inline: false
      }
    )
    .setFooter({ text: `Fondation SCP • Département de Sécurité • Mis à jour` })
    .setTimestamp();

  return embed;
}

function buildServiceButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prise_service')
      .setLabel('🟢 Prise de Service')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('fin_service')
      .setLabel('🔴 Fin de Service')
      .setStyle(ButtonStyle.Danger)
  );
}

module.exports = { buildLeaderboardEmbed, buildServiceButtons, formatDuration };
