import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateDaysLeft(dateString: string): number {
  const today = new Date()
  const targetDate = new Date(dateString)

  // 시간 정보를 제거하고 날짜만 비교
  today.setHours(0, 0, 0, 0)
  targetDate.setHours(0, 0, 0, 0)

  const diffTime = targetDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

// 포지션 카테고리 순서 (공격수 -> 미드필더 -> 수비수 -> 골키퍼)
export const getPositionOrder = (position: string) => {
  const pos = position.toUpperCase()
  if (pos === 'GK') return 4
  if (pos.includes('B') || pos.includes('D')) return 3 // DF
  if (pos.includes('M') || pos.includes('C')) return 2 // MF
  if (pos.includes('W') || pos.includes('F') || pos.includes('S')) return 1 // FW
  return 5 // Unknown
}

// 팀 선수들을 포지션 순으로 정렬
export const sortByPosition = (players: any[]) => {
  return [...players].sort((a, b) => {
    const posA = a.position || a.displayPosition || 'MC'
    const posB = b.position || b.displayPosition || 'MC'
    return getPositionOrder(posA) - getPositionOrder(posB)
  })
}

// 카카오톡 공유 텍스트 생성
export const generateKakaoShareText = (schedule: any, isManagerMode: boolean = false) => {
  const typeLabel = schedule.type === "internal" ? "자체경기" :
    schedule.type === "match" ? `A매치${schedule.opponentTeam ? ` vs ${schedule.opponentTeam}` : ''}` :
      schedule.type === "training" ? "연습" : schedule.type

  const [year, month, day] = schedule.date.split('-')
  const dateObj = new Date(Number(year), Number(month) - 1, Number(day))
  const dateStr = dateObj.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  })

  let text = `[경기 안내]\n`
  text += `📅 일정: ${dateStr} ${schedule.time}\n`
  text += `🏟️ 장소: ${schedule.location || '미정'}\n`
  text += `⚽ 유형: ${typeLabel}\n`

  if (schedule.description) {
    text += `📢 공지: ${schedule.description}\n`
  }

  // 팀 편성이 있는 경우 포함 (블루, 오렌지, 화이트)
  if (schedule.teamFormation && (isManagerMode || schedule.formationConfirmed)) {
    text += `\n[팀 편성]\n`

    const blueTeam = schedule.teamFormation.blueTeam || []
    const orangeTeam = schedule.teamFormation.orangeTeam || []
    const whiteTeam = schedule.teamFormation.whiteTeam || []

    if (blueTeam.length > 0) {
      text += `🔵 블루 팀 (${blueTeam.length}명)\n`
      text += blueTeam.map((p: any) => p.name).join(', ')
      text += `\n\n`
    }

    if (orangeTeam.length > 0) {
      text += `🟠 오렌지 팀 (${orangeTeam.length}명)\n`
      text += orangeTeam.map((p: any) => p.name).join(', ')
      text += `\n\n`
    }

    if (whiteTeam.length > 0) {
      text += `⚪ 화이트 팀 (${whiteTeam.length}명)\n`
      text += whiteTeam.map((p: any) => p.name).join(', ')
      text += `\n`
    }
  }

  return text.trim()
}