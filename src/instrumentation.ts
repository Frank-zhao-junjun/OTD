export async function register() {
  // Seed admin user on first startup
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { seedAdminUser } = await import('@/lib/users');
    await seedAdminUser();
  }
}
