const { SlashCommandBuilder } = require('discord.js');
const { Pool } = require('pg');

const RESET_ROLE_ID = process.env.RESET_ROLE_ID || null;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-classement')
    .setDescription('Remet a zero le classement total des heures de tous les agents.'),

  async execute(interaction) {
    // Verification du role
    if (RESET_ROLE_ID && !interaction.member.roles.cache.has(RESET_ROLE_ID)) {
      return interaction.reply({
        content: `🚫 Tu n'as pas le role requis pour reset le classement.`,
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
    });

    // Remet tout a zero mais garde les agents enregistres
    await pool.query('UPDATE agents SET total_ms = 0, in_service = FALSE, start_time = NULL, lien_appel = NULL');
    await pool.end();

    await interaction.editReply({ content: '✅ Classement remis a zero avec succes !' });
  }
};
