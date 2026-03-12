import express from "express"
import prisma from "./config/prisma.js";


const app = express()

async function main() {
  const user = await prisma.user.create({
    data: {
      username: 'test_user',
      email: 'test@example.com',
      password: 'dummy_hash_123', // In a real app, use bcrypt to hash this
    },
  });
  console.log('User created:', user);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());

app.listen(3000, () => {
    console.log("Listening")
})