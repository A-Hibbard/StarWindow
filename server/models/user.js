const bcrypt = require("bcryptjs");

const database = require("../config/database");
const SALT_ROUNDS = 6;

module.exports = {
  create,
  findOne,
  findById,
};


async function create(userData) {
  const email = userData.email.toLowerCase().trim();
  const f_name = userData.f_name.trim();
  const l_name = userData.l_name.trim();
  const password = userData.password.trim();
  const status_id = userData.status_id;

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await database.query(
    `
      INSERT INTO public.users (email, f_name, l_name, password, status_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id
    `,
    [email, f_name, l_name, hashedPassword, status_id]
  );

  return findById(result.rows[0]?.user_id);
}

async function findOne(req) {
  const email = req.email.trim().toLowerCase();

  const result = await database.query(
    `
      SELECT
        u.user_id,
        u.email,
        u.f_name,
        u.l_name,
        u.password,
        u.status_id,
        us.status
      FROM public.users u
      JOIN public.user_statuses us ON us.status_id = u.status_id
      WHERE lower(trim(u.email)) = $1
      LIMIT 1
    `, [email]);

  return result.rows[0] || null;
}

async function findById(userId) {
  const result = await database.query(
    `
      SELECT
        u.user_id,
        u.email,
        u.f_name,
        u.l_name,
        u.status_id,
        us.status
      FROM public.users u
      JOIN public.user_statuses us ON us.status_id = u.status_id
      WHERE u.user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}
