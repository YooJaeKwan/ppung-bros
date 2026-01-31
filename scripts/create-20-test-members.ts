
import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 테스트 멤버 20명 생성 시작...')

    const detailedPositions = ['ST', 'CF', 'LWF', 'RWF', 'CAM', 'CM', 'CDM', 'LM', 'RM', 'CB', 'LB', 'RB', 'GK']
    const regions = ['서울특별시', '경기도', '인천광역시']
    const cities: Record<string, string[]> = {
        '서울특별시': ['강남구', '강동구', '동대문구', '마포구', '서초구'],
        '경기도': ['수원시', '성남시', '용인시', '심흥시'],
        '인천광역시': ['부평구', '계양구', '연수구']
    }

    const newMembers = []

    for (let i = 1; i <= 20; i++) {
        const timestamp = Date.now()
        const region = regions[Math.floor(Math.random() * regions.length)]
        const cityList = cities[region]
        const city = cityList[Math.floor(Math.random() * cityList.length)]
        const pos = detailedPositions[Math.floor(Math.random() * detailedPositions.length)]

        newMembers.push({
            kakaoId: `test_kakao_${timestamp}_${i}`,
            provider: 'kakao',
            providerId: `test_id_${timestamp}_${i}`,
            nickname: `테스트선수${i}`,
            realName: `멤버${i}`,
            phoneNumber: `010${String(i).padStart(8, '0')}`,
            birthYear: String(1990 + Math.floor(Math.random() * 15)),
            preferredPosition: pos,
            subPositions: [],
            region: region,
            city: city,
            role: Role.MEMBER,
            level: Math.floor(Math.random() * 10) + 1,
            isActive: true,
        })
    }

    for (const member of newMembers) {
        const created = await prisma.user.create({
            data: member
        })
        console.log(`✅ 멤버 생성 완료: ${created.realName} (${created.preferredPosition})`)
    }

    console.log('✨ 총 20명의 테스트 멤버가 생성되었습니다.')
}

main()
    .catch((e) => {
        console.error('❌ 에러 발생:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
