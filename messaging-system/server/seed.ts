import { db } from './server';
import { users } from './schema';
import bcrypt from 'bcrypt';

async function seed() {
  const dummyUsers = [
    { username: 'john_doe', password: 'password1' },
    { username: 'jane_smith', password: 'password2' },
    { username: 'alex_jones', password: 'password3' },
    { username: 'emma_watson', password: 'password4' },
  ];

  for (const user of dummyUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10); 

    await db.insert(users).values({
      username: user.username,
      password: hashedPassword, // Storing the hashed password
      createdAt: new Date(),
    });
  }

  console.log('Dummy users created!');
}

seed().catch((err) => console.error(err));
