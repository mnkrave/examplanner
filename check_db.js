const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subjects = await prisma.subject.findMany({
    include: {
      files: {
        select: {
          id: true,
          name: true,
          type: true,
          mimeType: true,
          createdAt: true
        }
      },
      topics: true
    }
  });
  console.log("=== SUBJECTS IN DATABASE ===");
  console.log(JSON.stringify(subjects, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
