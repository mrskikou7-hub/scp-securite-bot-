const { SlashCommandBuilder } = require('discord.js');
const { buildLeaderboardEmbed, buildServiceButtons } = require('../utils/leaderboard');

// Rôle autorisé à déployer le panneau (défini dans .env)
const SETUP_ROLE_ID = process.env.SETUP_ROLE_ID || null;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-service')
    .setDescription('Initialise le panneau de service dans ce salon.'),

  async execute(interaction) {
    // Vérification du rôle
    if (SETUP_ROLE_ID && !interaction.member.roles.cache.has(SETUP_ROLE_ID)) {
      return interaction.reply({
        content: '🚫 Tu n\'as pas le rôle requis pour déployer le panneau de service.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const embed = buildLeaderboardEmbed();
    const buttons = buildServiceButtons();

    await interaction.channel.send({ embeds: [embed], components: [buttons] });
    await interaction.editReply({ content: '✅ Panneau de service déployé avec succès !' });
  }
};
