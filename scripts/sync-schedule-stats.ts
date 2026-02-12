import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 일정 통계 데이터 동기화를 시작합니다...')

  const schedules = await prisma.schedule.findMany({
    include: {
      attendances: true
    }
  })

  console.log(`총 ${schedules.length}개의 일정을 찾았습니다.`)

  for (const schedule of schedules) {
    const attendingCount = schedule.attendances.filter(a => a.status === 'ATTENDING').length
    const notAttendingCount = schedule.attendances.filter(a => a.status === 'NOT_ATTENDING').length
    const pendingCount = schedule.attendances.filter(a => a.status === 'PENDING').length

    await prisma.schedule.update({
      where: { id: schedule.id },
      data: {
        attendingCount,
        notAttendingCount,
        pendingCount
      }
    })
  }

  console.log('✅ 모든 일정의 통계 데이터 동기화가 완료되었습니다.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
