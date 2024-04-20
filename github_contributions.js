import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.GITHUB_TOKEN;
const query = `
query($userName:String!) {
  user(login: $userName){
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
          }
        }
      }
    }
  }
}
`;

async function retrieveContributionData(userName) {
  const variables = `
  {
    "userName": "${userName}"
  }
`;
  const body = {
    query,
    variables
  };
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(body)
  });
  return res.json();
}

export { retrieveContributionData };
