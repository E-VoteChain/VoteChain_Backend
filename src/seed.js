import logger from './config/logger.js';
import prisma from './config/db.js';

const seedData = async () => {
  const data = [
    {
      name: 'Andhra Pradesh',
      districts: [
        {
          name: 'Guntur',
          mandals: [
            {
              name: 'Guntur East',
              constituencies: ['Guntur-1', 'Guntur-2', 'Guntur-3', 'Guntur-4', 'Guntur-5'],
            },
            {
              name: 'Guntur West',
              constituencies: ['Brodipet', 'Arundelpet', 'Nallapadu', 'Gorantla', 'Lalapet'],
            },
            {
              name: 'Tenali',
              constituencies: ['Tenali-1', 'Tenali-2', 'Kollipara', 'Duggirala', 'Bapatla Rural'],
            },
            {
              name: 'Mangalagiri',
              constituencies: [
                'Tadepalli',
                'Mangalagiri-1',
                'Mangalagiri-2',
                'Chinakakani',
                'Kaza',
              ],
            },
            {
              name: 'Narasaraopet',
              constituencies: [
                'Narasaraopet-1',
                'Narasaraopet-2',
                'Chilakaluripet',
                'Vinukonda',
                'Sattenapalli',
              ],
            },
          ],
        },
        {
          name: 'Krishna',
          mandals: [
            {
              name: 'Vijayawada Central',
              constituencies: [
                'Vijayawada-1',
                'Vijayawada-2',
                'Bhavanipuram',
                'Ajit Singh Nagar',
                'Governorpet',
              ],
            },
            {
              name: 'Machilipatnam',
              constituencies: ['Machilipatnam-1', 'Pedana', 'Guduru', 'Challapalli', 'Koduru'],
            },
            {
              name: 'Nuzvid',
              constituencies: ['Nuzvid-1', 'Agiripalli', 'Chatrai', 'Mylavaram', 'Vissannapeta'],
            },
            {
              name: 'Gudivada',
              constituencies: ['Gudivada-1', 'Gudivada-2', 'Pamarru', 'Movva', 'Mandavalli'],
            },
            {
              name: 'Tiruvuru',
              constituencies: [
                'Tiruvuru-1',
                'Tiruvuru-2',
                'Vemavaram',
                'Nandigama',
                'Kanchikacherla',
              ],
            },
          ],
        },
        {
          name: 'Prakasam',
          mandals: [
            {
              name: 'Ongole',
              constituencies: ['Ongole-1', 'Ongole-2', 'Santhamaguluru', 'Chirala', 'Kandukur'],
            },
            {
              name: 'Kandukur',
              constituencies: [
                'Kandukur-1',
                'Voletivaripalem',
                'Gudluru',
                'Lingasamudram',
                'Ulavapadu',
              ],
            },
            {
              name: 'Markapur',
              constituencies: [
                'Markapur-1',
                'Tarlupadu',
                'Yerragondapalem',
                'Giddalur',
                'Bestavaripeta',
              ],
            },
            {
              name: 'Addanki',
              constituencies: ['Addanki-1', 'Addanki-2', 'Korisapadu', 'Ballikurava', 'Tallur'],
            },
            {
              name: 'Darsi',
              constituencies: ['Darsi-1', 'Kurichedu', 'Donakonda', 'Mundlamuru', 'Podili'],
            },
          ],
        },
        {
          name: 'Nellore',
          mandals: [
            {
              name: 'Kavali',
              constituencies: ['Kavali-1', 'Kavali-2', 'Bogole', 'Bitragunta', 'Kaligiri'],
            },
            {
              name: 'Atmakur',
              constituencies: ['Atmakur-1', 'Atmakur-2', 'Sangam', 'Kovur', 'Allur'],
            },
            {
              name: 'Nellore City',
              constituencies: [
                'Nellore-1',
                'Nellore-2',
                'Nellore Rural',
                'Vedayapalem',
                'Podalakur',
              ],
            },
            {
              name: 'Gudur',
              constituencies: ['Gudur-1', 'Manubolu', 'Naidupeta', 'Ozili', 'Balayapalli'],
            },
            {
              name: 'Venkatagiri',
              constituencies: ['Venkatagiri-1', 'Rapur', 'Sullurupeta', 'Vakadu', 'Chillakur'],
            },
          ],
        },
        {
          name: 'Chittoor',
          mandals: [
            {
              name: 'Tirupati Urban',
              constituencies: [
                'Tirupati-1',
                'Tirupati-2',
                'Renigunta',
                'Chandragiri',
                'Tiruchanoor',
              ],
            },
            {
              name: 'Madanapalle',
              constituencies: [
                'Madanapalle-1',
                'Vayalpadu',
                'B.Kothakota',
                'Kurabalakota',
                'Angallu',
              ],
            },
            {
              name: 'Piler',
              constituencies: ['Piler-1', 'Kalakada', 'Rompicherla', 'Kalikiri', 'Vayalpad'],
            },
            {
              name: 'Chittoor',
              constituencies: [
                'Chittoor-1',
                'Chittoor-2',
                'Gangadhara Nellore',
                'Penumur',
                'Irala',
              ],
            },
            {
              name: 'Palamaner',
              constituencies: [
                'Palamaner-1',
                'Kuppam',
                'Gudupalle',
                'Venkatagirikota',
                'Baireddipalle',
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Telangana',
      districts: [
        {
          name: 'Hyderabad',
          mandals: [
            {
              name: 'Charminar',
              constituencies: [
                'Charminar-1',
                'Bahadurpura',
                'Yakutpura',
                'Chandrayangutta',
                'Malakpet',
              ],
            },
            {
              name: 'Secunderabad',
              constituencies: ['Secunderabad-1', 'Malkajgiri', 'Tarnaka', 'Begumpet', 'Alwal'],
            },
            {
              name: 'Jubilee Hills',
              constituencies: [
                'Jubilee Hills-1',
                'Film Nagar',
                'Madhapur',
                'Banjara Hills',
                'HiTec City',
              ],
            },
            {
              name: 'Khairatabad',
              constituencies: [
                'Khairatabad-1',
                'Somajiguda',
                'Ameerpet',
                'Punjagutta',
                'Erragadda',
              ],
            },
            {
              name: 'Musheerabad',
              constituencies: [
                'Musheerabad-1',
                'Chikkadpally',
                'Kacheguda',
                'Narayanaguda',
                'Himayatnagar',
              ],
            },
          ],
        },
        {
          name: 'Warangal',
          mandals: [
            {
              name: 'Hanamkonda',
              constituencies: ['Hanamkonda-1', 'Kazipet', 'Warangal West', 'Warangal East', 'Urs'],
            },
            {
              name: 'Narsampet',
              constituencies: [
                'Narsampet-1',
                'Chennaraopet',
                'Duggondi',
                'Nallabelli',
                'Kothaguda',
              ],
            },
            {
              name: 'Bhupalpally',
              constituencies: ['Bhupalpally-1', 'Mulug', 'Mahadevpur', 'Tekumatla', 'Regonda'],
            },
            {
              name: 'Jangaon',
              constituencies: [
                'Jangaon-1',
                'Ghanpur',
                'Raghunathpalle',
                'Zaffergadh',
                'Palakurthi',
              ],
            },
            {
              name: 'Parkal',
              constituencies: ['Parkal-1', 'Mogullapalli', 'Atmakur', 'Shyampet', 'Dharmasagar'],
            },
          ],
        },
      ],
    },
  ];

  for (const state of data) {
    console.log(`Seeding state: ${state.name}`);
    let stateRecord = await prisma.state.findFirst({ where: { name: state.name } });
    if (!stateRecord) {
      stateRecord = await prisma.state.create({ data: { name: state.name } });
    }

    for (const district of state.districts) {
      let districtRecord = await prisma.district.findFirst({
        where: { name: district.name, state_id: stateRecord.id },
      });
      if (!districtRecord) {
        districtRecord = await prisma.district.create({
          data: { name: district.name, state_id: stateRecord.id },
        });
      }

      for (const mandal of district.mandals) {
        let mandalRecord = await prisma.mandal.findFirst({
          where: { name: mandal.name, district_id: districtRecord.id },
        });
        if (!mandalRecord) {
          mandalRecord = await prisma.mandal.create({
            data: { name: mandal.name, district_id: districtRecord.id },
          });
        }

        for (const constituencyName of mandal.constituencies) {
          const exists = await prisma.constituency.findFirst({
            where: { name: constituencyName, mandal_id: mandalRecord.id },
          });
          if (!exists) {
            await prisma.constituency.create({
              data: { name: constituencyName, mandal_id: mandalRecord.id },
            });
          }
        }
      }
    }
  }

  logger.info('✅ Seeding completed!');
};

export default seedData;
