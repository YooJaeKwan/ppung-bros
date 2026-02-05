import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic' // API 캐싱 방지

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')

    console.log(`일정 목록 조회 요청 (status: ${status || 'all'}, userId: ${userId})`)

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    let dateFilter: any = {}
    if (status === 'upcoming') {
      dateFilter = {
        matchDate: {
          gte: now
        }
      }
    } else if (status === 'past') {
      dateFilter = {
        matchDate: {
          lt: now
        }
      }
    }

    const schedules = await prisma.schedule.findMany({
      where: dateFilter,
      include: {
        creator: {
          select: {
            id: true,
            realName: true,
            nickname: true
          }
        },
        attendances: {
          include: {
            user: {
              select: {
                id: true,
                realName: true,
                nickname: true,
                level: true
              }
            }
          }
        }
      },
      orderBy: {
        matchDate: 'asc'
      }
    })

    console.log(`일정 ${schedules.length}개 조회 완료`)

    // 모든 팀원 정보를 미리 가져오기 (비동기 작업을 map 밖에서 처리)
    // 활성 회원만 조회하여 Pending 목록 생성에 사용
    const allUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        realName: true,
        nickname: true,
        level: true
      }
    })

    const formattedSchedules = schedules.map(schedule => {
      const attendees = schedule.attendances.map(attendance => {
        if (attendance.isGuest) {
          return {
            status: attendance.status.toLowerCase(),
            userId: attendance.guestId || attendance.userId,
            isGuest: true
          }
        }
        return {
          status: attendance.status.toLowerCase(),
          userId: attendance.user?.id || attendance.userId,
          isGuest: false
        }
      })

      const activeUserAttendees = allUsers.map(user => {
        const existingAttendance = attendees.find(a => a.userId === user.id && !a.isGuest)
        if (existingAttendance) {
          return existingAttendance
        }
        return {
          status: 'pending',
          userId: user.id,
          isGuest: false
        }
      })

      const otherAttendees = attendees.filter(a =>
        a.isGuest || (a.userId && !allUsers.some(u => u.id === a.userId))
      )

      const finalAttendeesForStats = [...activeUserAttendees, ...otherAttendees]

      const attendanceStats = {
        attending: 0,
        notAttending: 0,
        pending: 0
      }

      finalAttendeesForStats.forEach(a => {
        if (a.status === 'attending') attendanceStats.attending++
        else if (a.status === 'not_attending') attendanceStats.notAttending++
        else if (a.status === 'pending') attendanceStats.pending++
      })

      let myAttendance = 'pending'
      if (userId) {
        const myRecord = finalAttendeesForStats.find(a => !a.isGuest && a.userId === userId)
        if (myRecord) {
          myAttendance = myRecord.status
        }
      }

      return {
        id: schedule.id,
        title: schedule.title,
        type: schedule.type,
        date: (() => {
          const kstDate = new Date(schedule.matchDate.getTime() + (9 * 60 * 60 * 1000))
          return kstDate.toISOString().split('T')[0]
        })(),
        time: schedule.startTime,
        gatherTime: schedule.gatherTime,
        location: schedule.location,
        maxAttendees: schedule.maxAttendees,
        restTime: schedule.restTime,
        description: schedule.description,
        opponentTeam: schedule.opponentTeam,
        trainingContent: schedule.trainingContent,
        status: schedule.status.toLowerCase(),
        ourScore: (schedule as any).ourScore,
        opponentScore: (schedule as any).opponentScore,
        mvpUserId: (schedule as any).mvpUserId,
        matchSummary: (schedule as any).matchSummary,
        
        attendanceStats, 
        myAttendance,
        
        attendances: schedule.attendances,
        teamFormation: schedule.teamFormation,
        formationDate: schedule.formationDate?.toISOString() || null,
        formationConfirmed: schedule.formationConfirmed || false,
        allowGuests: schedule.allowGuests || false,
        createdBy: {
          id: schedule.creator.id,
          name: schedule.creator.realName || schedule.creator.nickname
        },
        createdAt: schedule.createdAt.toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      schedules: formattedSchedules,
      count: formattedSchedules.length
    })

  } catch (error) {
    console.error('일정 목록 조회 중 오류:', error)

    return NextResponse.json(
      { error: '일정 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
