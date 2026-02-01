import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('일정 등록 요청:', body)

    const {
      title,
      type,
      date,
      time,
      gatherTime,
      location,
      restTime = 5,
      description = "",
      opponentTeam = null,
      trainingContent = null,
      createdBy
    } = body

    // 필수 필드 검증 (title, gatherTime, type 제거)
    if (!date || !time || !location || !createdBy) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      )
    }



    // 한국시간을 명시적으로 지정하여 DateTime 생성 (KST: UTC+9)
    const inputDateTime = new Date(`${date}T${time}:00.000+09:00`)

    if (inputDateTime < new Date()) {
      return NextResponse.json(
        { error: '과거 날짜로는 일정을 등록할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 생성자 사용자 존재 확인
    const creator = await prisma.user.findUnique({
      where: { id: createdBy }
    })

    if (!creator) {
      return NextResponse.json(
        { error: '유효하지 않은 사용자입니다.' },
        { status: 404 }
      )
    }

    // 장소 + 시간으로 제목 자동 생성
    const autoTitle = `${location}\n${time}`

    // 새 일정 생성
    const newSchedule = await prisma.schedule.create({
      data: {
        title: autoTitle,
        type: "internal",
        matchDate: inputDateTime, // DateTime으로 저장
        startTime: time,
        gatherTime: gatherTime || "",
        location: location.trim(),
        restTime: Number(restTime),
        description: description.trim() || null,
        opponentTeam: opponentTeam?.trim() || null,
        trainingContent: trainingContent?.trim() || null,
        createdBy,
        status: "SCHEDULED"
      },
      include: {
        creator: {
          select: {
            id: true,
            realName: true,
            nickname: true
          }
        }
      }
    })

    console.log('새 일정 생성 완료:', newSchedule.id)

    return NextResponse.json({
      success: true,
      message: '일정이 성공적으로 등록되었습니다.',
      schedule: {
        id: newSchedule.id,
        title: newSchedule.title,
        type: newSchedule.type,
        date: newSchedule.matchDate.toISOString().split('T')[0],
        time: newSchedule.startTime,
        gatherTime: newSchedule.gatherTime,
        location: newSchedule.location,
        restTime: newSchedule.restTime,
        description: newSchedule.description,
        opponentTeam: newSchedule.opponentTeam,
        trainingContent: newSchedule.trainingContent,
        status: newSchedule.status,
        createdBy: {
          id: newSchedule.creator.id,
          name: newSchedule.creator.realName || newSchedule.creator.nickname
        },
        createdAt: newSchedule.createdAt.toISOString()
      }
    })

  } catch (error) {
    console.error('일정 등록 중 오류:', error)

    return NextResponse.json(
      { error: '일정 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
