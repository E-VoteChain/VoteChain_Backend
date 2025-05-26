import { faker } from '@faker-js/faker';

const themes = [
  'education',
  'healthcare',
  'agriculture',
  'infrastructure',
  'employment',
  'women empowerment',
  'youth development',
  'digital transformation',
  'rural development',
  'clean energy',
];

export const generateCandidateDescription = () => {
  const roles = [
    'Social activist',
    'Economist',
    'Former teacher',
    'Healthcare professional',
    'Successful businessman',
    'Grassroots organizer',
    'Youth leader',
    'Lawyer and public servant',
    'Technology advocate',
  ];
  const causes = [
    "women's rights",
    'environmental protection',
    'inclusive development',
    'rural education',
    'public health',
    'job creation',
    'digital access',
  ];

  const role = faker.helpers.arrayElement(roles);
  const cause = faker.helpers.arrayElement(causes);

  return `${role} with a passion for ${cause}. Committed to transparent governance and sustainable development.`;
};

export const generateManifestoDescription = () => {
  const theme = faker.helpers.arrayElement(themes);

  return `Our vision is to build a nation where every citizen has access to quality ${theme}, modern infrastructure, and equal economic opportunities. We aim to foster innovation, bridge the urban-rural divide, and empower all communities through inclusive and transparent governance.`;
};
