import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const now = new Date()

    // 1. 활성 회원 수 조회 (미응답 계산용)
    const activeUserCountRequest = prisma.user.count({
      where: { isActive: true }
    })

    // 2. 다음 일정 (가장 가까운 미래 일정 1개) - 실시간 통계 계산을 위해 전체 참석자 조회
    // matchDate가 현재 시간보다 크거나 같은 첫 번째 일정을 가져옴
    const nextScheduleRequest = prisma.schedule.findFirst({
      where: {
        matchDate: {
          gte: now
        }
      },
      orderBy: {
        matchDate: 'asc'
      },
      include: {
        // 모든 참석자 정보 조회 (게스트 포함)
        attendances: {
          select: {
            userId: true,
            status: true,
            isGuest: true
          }
        }
      }
    })

    // 3. 최근 경기 (과거 일정 3개)
    // matchDate가 현재 시간보다 작은 일정 중 최근 3개를 가져옴
    const recentMatchesRequest = prisma.schedule.findMany({
      where: {
        matchDate: {
          lt: now
        },
        // 결과가 있는 경기만? 아니면 참석한 경기만? -> 기존 로직은 "참석한" 경기
        attendances: {
          some: {
            userId: userId,
            status: 'ATTENDING'
          }
        }
      },
      orderBy: {
        matchDate: 'desc'
      },
      take: 3,
      include: {
        attendances: {
          where: { userId }
        }
      }
    })

    // 3. 올해 통계 계산용 (올해 모든 일정)
    const currentYear = new Date().getFullYear()
    const yearStart = new Date(currentYear, 0, 1) // 1월 1일

    const yearSchedulesRequest = prisma.schedule.findMany({
      where: {
        matchDate: {
          gte: yearStart
        }
      },
      select: {
        id: true,
        type: true,
        matchDate: true,
        teamFormation: true,
        attendances: {
          where: {
            userId,
            status: 'ATTENDING'
          }
        }
      }
    })

    // 4. 뱃지 정보
    const badgesRequest = prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' }
    })

    // 병렬 실행
    const [activeUserCount, nextSchedule, recentMatches, yearSchedules, userBadges] = await Promise.all([
      activeUserCountRequest,
      nextScheduleRequest,
      recentMatchesRequest,
      yearSchedulesRequest,
      badgesRequest
    ])

    // --- 데이터 가공 ---

    // 1. 통계 계산
    let attendedCount = 0
    yearSchedules.forEach((schedule: any) => {
      const isAttended = schedule.attendances.length > 0
      if (isAttended) attendedCount++
    })

    const totalYearSchedules = yearSchedules.length
    const attendanceRate = totalYearSchedules > 0 ? (attendedCount / totalYearSchedules) * 100 : 0

    // 2. 다음 일정 가공
    let formattedNextSchedule = null
    if (nextSchedule) {
      // 실시간 통계 계산
      const attendances = nextSchedule.attendances || []

      const attendingCount = attendances.filter((a: any) => a.status === 'ATTENDING').length
      const notAttendingCount = attendances.filter((a: any) => a.status === 'NOT_ATTENDING').length

      // 미응답 계산: 전체 활성 유저 - (투표한 유저 수)
      // 게스트는 미응답 카운트에 포함되지 않음
      const votedUserCount = attendances.filter((a: any) => !a.isGuest && (a.status === 'ATTENDING' || a.status === 'NOT_ATTENDING')).length
      const pendingCount = Math.max(0, activeUserCount - votedUserCount)

      // 현재 사용자의 참석 상태 찾기
      const myAttendance = attendances.find((a: any) => a.userId === userId)

      formattedNextSchedule = {
        ...nextSchedule,
        // KST 기준 날짜 변환 (UTC+9)
        date: new Date(nextSchedule.matchDate.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: nextSchedule.startTime,
        maxAttendees: nextSchedule.maxAttendees,
        // 현재 사용자의 참석 상태
        myAttendance: myAttendance?.status || 'PENDING',
        // 실시간 계산된 통계 사용
        attendanceStats: {
          attending: attendingCount,
          notAttending: notAttendingCount,
          pending: pendingCount,
          total: attendingCount + notAttendingCount + pendingCount
        }
      }
    }

    // 3. 최근 경기 가공
    const formattedRecentMatches = recentMatches.map((match: any) => {
      return {
        id: match.id,
        date: new Date(match.matchDate.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0],
        location: match.location,
        type: match.type
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        nextSchedule: formattedNextSchedule,
        stats: {
          attendance: {
            attended: attendedCount,
            total: totalYearSchedules,
            rate: attendanceRate
          }
        },
        recentMatches: formattedRecentMatches,
        badges: userBadges
      }
    })

  } catch (error) {
    console.error('대시보드 데이터 조회 실패:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
