export const user = {
    awards: [
        {
            id: 1,
            invested: 100,
            firstLineReferralAmount: 1000,
            allReferralAmount: 0,
            award: 100,
        },
        {
            id: 2,
            invested: 300,
            firstLineReferralAmount: 3000,
            allReferralAmount: 0,
            award: 150,
        },
        {
            id: 3,
            invested: 1000,
            firstLineReferralAmount: 5000,
            allReferralAmount: 20000,
            award: 500,
        },
        {
            id: 4,
            invested: 5000,
            firstLineReferralAmount: 5000,
            allReferralAmount: 50000,
            award: 1500,
        },
        {
            id: 5,
            invested: 10000,
            firstLineReferralAmount: 5000,
            allReferralAmount: 200000,
            award: 5000,
        },
        {
            id: 6,
            invested: 25000,
            firstLineReferralAmount: 6000,
            allReferralAmount: 500000,
            award: 13000,
        },
        {
            id: 7,
            invested: 50000,
            firstLineReferralAmount: 7000,
            allReferralAmount: 1000000,
            award: 30000,
        },
        {
            id: 8,
            invested: 100000,
            firstLineReferralAmount: 8000,
            allReferralAmount: 3000000,
            award: 60000,
        },
        {
            id: 9,
            invested: 150000,
            firstLineReferralAmount: 10000,
            allReferralAmount: 10000000,
            award: 110000,
        },
        {
            id: 10,
            invested: 250000,
            firstLineReferralAmount: 12000,
            allReferralAmount: 30000000,
            award: 165000,
        },
        {
            id: 11,
            invested: 300000,
            firstLineReferralAmount: 15000,
            allReferralAmount: 100000000,
            award: 245000,
        },
    ],
    referralAwards: [
        {
            id: 1,
            amount: {
                from: 100,
                to: 490,
            },
            referralAmount: {
                from: 100,
                to: 199,
            },
            award: 0.02,
        },
        {
            id: 12,
            amount: {
                from: 200,
                to: 490,
            },
            referralAmount: {
                from: 100,
                to: 190,
            },
            award: 0.025,
        },
        {
            amount: {
                from: 100,
                to: 490,
            },
            referralAmount: {
                from: 100,
                to: 190,
            },
            award: 0.02,
        },
        {
            amount: {
                from: 100,
                to: 490,
            },
            referralAmount: {
                from: 100,
                to: 190,
            },
            award: 0.02,
        },
        {
            amount: {
                from: 100,
                to: 490,
            },
            referralAmount: {
                from: 100,
                to: 190,
            },
            award: 0.02,
        },
        {
            amount: {
                from: 100,
                to: 490,
            },
            referralAmount: {
                from: 100,
                to: 190,
            },
            award: 0.02,
        },
        {
            amount: {
                from: 100,
                to: 490,
            },
            referralAmount: {
                from: 100,
                to: 190,
            },
            award: 0.02,
        },
        {
            amount: {
                from: 100,
                to: 490,
            },
            referralAmount: {
                from: 100,
                to: 190,
            },
            award: 0.02,
        },
        {
            amount: {
                from: 100,
                to: 490,
            },
            referralAmount: {
                from: 100,
                to: 190,
            },
            award: 0.02,
        },
        {
            amount: {
                from: 100,
                to: 490,
            },
            referralAmount: {
                from: 100,
                to: 190,
            },
            award: 0.02,
        },
        {
            amount: {
                from: 100,
                to: 490,
            },
            referralAmount: {
                from: 100,
                to: 190,
            },
            award: 0.02,
        },
        {
            amount: {
                from: 100,
                to: 490,
            },
            referralAmount: {
                from: 100,
                to: 190,
            },
            award: 0.02,
        },
        {
            amount: {
                from: 100,
                to: 490,
            },
            referralAmount: {
                from: 100,
                to: 190,
            },
            award: 0.02,
        },
        {
            amount: {
                from: 100,
                to: 490,
            },
            referralAmount: {
                from: 100,
                to: 190,
            },
            award: 0.02,
        },
    ],
    // award это процент
    // referralLine до какой линии реферала должен быть оборот
    statuses: [
        {
            id: 1,
            name: 'Консультант',
            invested: 500,
            referralAmount: 0,
            referralLine: 0,
            award: 0.05,
        },
        {
            id: 2,
            name: 'Старший консультант',
            invested: 1000,
            referralAmount: 0,
            referralLine: 0,
            award: 0.06,
        },
        {
            id: 3,
            name: 'Лидер',
            invested: 5000,
            referralAmount: 2500,
            referralLine: 1,
            award: 0.07,
        },
        {
            id: 4,
            name: 'Вице директор',
            invested: 5000,
            referralAmount: 20000,
            referralLine: 2,
            award: 0.08,
        },
        {
            id: 5,
            name: 'Кандидат директор',
            invested: 5000,
            referralAmount: 50000,
            referralLine: 3,
            award: 0.09,
        },
        {
            id: 6,
            name: 'Директор',
            invested: 5000,
            referralAmount: 200000,
            referralLine: 4,
            award: 0.01,
        },
        {
            id: 7,
            name: 'Серебряный директор',
            invested: 5000,
            referralAmount: 500000,
            referralLine: 5,
            award: 0.011,
        },
        {
            id: 8,
            name: 'Золотой директор',
            invested: 5000,
            // 1 000 000
            referralAmount: 1000000,
            referralLine: 6,
            award: 0.012,
        },
        {
            id: 9,
            name: 'Брильянтовый директор',
            invested: 5000,
            // 3 000 000
            referralAmount: 3000000,
            referralLine: 7,
            award: 0.013,
        },
        {
            id: 10,
            name: 'Региональный партнер',
            invested: 5000,
            // 10 000 000
            referralAmount: 10000000,
            referralLine: 8,
            award: 0.014,
        },
        {
            id: 11,
            name: 'Международный партнер',
            invested: 5000,
            // 30 000 000
            referralAmount: 30000000,
            referralLine: 9,
            award: 0.015,
        },
    ],
};
 