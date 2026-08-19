import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { updates, userId } = body

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: '업데이트할 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 관리자 권한 확인
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '수정 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 트랜잭션으로 일괄 처리
    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const { scheduleId, targetUserId, status } = update // status: 'O' | 'X' | '-'

        if (status === '-') {
          // 기록 삭제
          await tx.scheduleAttendance.deleteMany({
            where: {
              scheduleId,
              userId: targetUserId
            }
          })
        } else {
          // O -> ATTENDING, X -> ABSENT (기본적으로 ABSENT 상태값이 없으므로 NOT_ATTENDING 사용)
          const dbStatus = status === 'O' ? 'ATTENDING' : 'NOT_ATTENDING'

          // 기존 기록이 있는지 확인
          const existing = await tx.scheduleAttendance.findUnique({
            where: {
              scheduleId_userId: {
                scheduleId,
                userId: targetUserId
              }
            }
          })

          if (existing) {
            await tx.scheduleAttendance.update({
              where: { id: existing.id },
              data: { status: dbStatus }
            })
          } else {
            await tx.scheduleAttendance.create({
              data: {
                scheduleId,
                userId: targetUserId,
                status: dbStatus
              }
            })
          }
        }
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('출석부 일괄 수정 실패:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
