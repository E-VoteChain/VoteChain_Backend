export const getPriority = (type, level) => {
  if (type === 'LOK_SABHA') return 'HIGH';
  if (type === 'VIDHAN_SABHA' && level === 'STATE') return 'HIGH';
  if (type === 'VIDHAN_SABHA') return 'MEDIUM';
  if (type === 'MUNICIPAL') return 'MEDIUM';
  if (type === 'PANCHAYAT') return 'LOW';
  if (type === 'BY_ELECTION') return 'MEDIUM';
  return 'LOW';
};

export const getElectionTags = (electionType, electionLevel) => {
  const tags = [];

  switch (electionType) {
    case 'LOK_SABHA':
      tags.push('National', 'General Election', 'Lok Sabha');
      break;
    case 'VIDHAN_SABHA':
      tags.push('State', 'Assembly Election', 'Vidhan Sabha');
      break;
    case 'MUNICIPAL':
      tags.push('Urban', 'Local Body', 'Municipal');
      break;
    case 'PANCHAYAT':
      tags.push('Rural', 'Local Body', 'Panchayat');
      break;
    case 'BY_ELECTION':
      tags.push('By-Election', 'Mid-Term', 'Replacement');
      break;
    default:
      tags.push('Unknown Type');
  }

  console.log(`Election Type: ${electionType}, Tags: ${tags.join(', ')}`);

  switch (electionLevel) {
    case 'STATE':
      tags.push('State Level');
      break;
    case 'DISTRICT':
      tags.push('District Level');
      break;
    case 'MANDAL':
      tags.push('Mandal Level');
      break;
    case 'CONSTITUENCY':
      tags.push('Constituency Level');
      break;
  }

  console.log(`Election Level: ${electionLevel}, Tags: ${tags.join(', ')}`);

  return tags;
};
