import { PrismaClient } from '@prisma/client'
import { updateScheduleAttendanceStatsWithPending } from '../lib/attendance-stats'

const prisma = new PrismaClient()

async function main() {
  console.log('Testing waitlist functionality...')

  // 1. 가장 최근의 SCHEDULED 또는 다가오는 일정 찾기
  const schedule = await prisma.schedule.findFirst({
    where: { status: 'SCHEDULED' },
    orderBy: { matchDate: 'asc' }
  })

  if (!schedule) {
    console.log('진행 예정인 일정을 찾을 수 없습니다.')
    return
  }

  console.log(`선택된 일정: ${schedule.title} (${schedule.id})`)

  // 2. 인원 제한 설정 (예: 5명)
  const maxAttendees = 5
  await prisma.schedule.update({
    where: { id: schedule.id },
    data: { maxAttendees }
  })
  console.log(`인원 제한을 ${maxAttendees}명으로 설정했습니다.`)

  // 3. 사용자 가져오기
  const users = await prisma.user.findMany({
    where: { isActive: true },
    take: 10
  })

  if (users.length < 8) {
    console.log('충분한 사용자가 없습니다 (최소 8명 필요).')
    return
  }

  // 4. 기존 투표 내역 삭제
  await prisma.scheduleAttendance.deleteMany({
    where: { scheduleId: schedule.id }
  })
  console.log('기존 투표 내역을 초기화했습니다.')

  // 5. 5명을 ATTENDING으로 설정
  const attendingUsers = users.slice(0, 5)
  for (let i = 0; i < attendingUsers.length; i++) {
    const user = attendingUsers[i]
    // 순차적으로 시간을 두어 생성 (가장 최근 순)
    const date = new Date(Date.now() - (10 - i) * 60000)
    
    await prisma.scheduleAttendance.create({
      data: {
        scheduleId: schedule.id,
        userId: user.id,
        status: 'ATTENDING',
        createdAt: date,
        updatedAt: date
      }
    })
    console.log(`- 참석 투표 추가됨: ${user.name || user.nickname}`)
  }

  // 6. 3명을 WAITING으로 설정
  const waitingUsers = users.slice(5, 8)
  for (let i = 0; i < waitingUsers.length; i++) {
    const user = waitingUsers[i]
    // 참석자들보다 늦게 투표
    const date = new Date(Date.now() - (5 - i) * 60000)
    
    await prisma.scheduleAttendance.create({
      data: {
        scheduleId: schedule.id,
        userId: user.id,
        status: 'WAITING',
        createdAt: date,
        updatedAt: date
      }
    })
    console.log(`- 웨이팅 투표 추가됨: ${user.name || user.nickname} (순위: ${i + 1})`)
  }

  // 7. 통계 업데이트
  await updateScheduleAttendanceStatsWithPending(schedule.id)
  console.log('참석 통계를 업데이트했습니다.')

  console.log('\n✅ 테스트 데이터 세팅이 완료되었습니다!')
  console.log(`이제 앱에서 "${schedule.title}" 일정을 확인해보세요.`)
  console.log('기존 참석자 중 한 명을 불참으로 변경하면, 웨이팅 1순위가 자동으로 참석으로 전환되는지 확인할 수 있습니다.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
