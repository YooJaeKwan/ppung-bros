import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const targetDateStart = new Date('2026-02-06T00:00:00.000Z')
    const targetDateEnd = new Date('2026-02-06T23:59:59.999Z')

    const schedule = await prisma.schedule.findFirst({
        where: {
            matchDate: {
                gte: targetDateStart,
                lte: targetDateEnd
            }
        }
    })

    if (!schedule) {
        console.log('❌ 2026년 2월 6일 일정을 찾을 수 없습니다.')
        return
    }

    console.log(`✅ 일정 찾음: ${schedule.title} (${schedule.matchDate})`)

    const users = await prisma.user.findMany({
        where: { isActive: true },
        take: 15
    })

    if (users.length < 15) {
        console.warn(`⚠️ 경고: 활성 유저가 ${users.length}명뿐입니다. 있는 만큼만 추가합니다.`)
    }

    console.log(`👥 ${users.length}명의 멤버를 참석 처리합니다...`)

    let addedCount = 0
    for (const user of users) {
        const existing = await prisma.scheduleAttendance.findUnique({
            where: {
                scheduleId_userId: {
                    scheduleId: schedule.id,
                    userId: user.id
                }
            }
        })

        if (existing) {
            await prisma.scheduleAttendance.update({
                where: { id: existing.id },
                data: { status: 'ATTENDING' }
            })
        } else {
            await prisma.scheduleAttendance.create({
                data: {
                    scheduleId: schedule.id,
                    userId: user.id,
                    status: 'ATTENDING'
                }
            })
            addedCount++
        }
    }

    console.log(`🎉 완료! 총 ${users.length}명 참석 확정 (신규 추가: ${addedCount}명)`)
    
    const count = await prisma.scheduleAttendance.count({
        where: {
            scheduleId: schedule.id,
            status: 'ATTENDING'
        }
    })

    await prisma.schedule.update({
        where: { id: schedule.id },
        data: { attendingCount: count }
    })
    console.log(`📊 통계 업데이트 완료: 참석 ${count}명`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
