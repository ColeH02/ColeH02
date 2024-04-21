import { retrieveContributionData } from './github_contributions.js'; 
import fs from 'fs';

const userName = 'ColeHausman'; // GitHub username
const generations = 90; // Number of generations to generate

function getCellColor(contributionCount) {
    if (contributionCount > 0 && contributionCount < 5) return 1;
    else if (contributionCount < 10) return 2;
    else if (contributionCount < 15) return 3;
    else return 4;
}

function nextGeneration(contributionMatrix) {
    let M = contributionMatrix.length;
    let future = new Array(M);

    for (let l = 0; l < M; l++) {
        let N = contributionMatrix[l].length;
        future[l] = new Array(N).fill({ contributionCount: 0, date: "" });

        for (let m = 0; m < N; m++) {
            let aliveNeighbours = 0;
            let neighbors = [];

            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    let ni = l + i;
                    let nj = m + j;
                    if (ni >= 0 && ni < M && nj >= 0 && nj < contributionMatrix[ni].length) { // Check that nj is valid for row ni
                        let neighborCount = contributionMatrix[ni][nj].contributionCount;
                        aliveNeighbours += neighborCount > 0 ? 1 : 0;
                        if (neighborCount > 0) {
                            neighbors.push(getCellColor(neighborCount));
                        }
                    }
                }
            }

            let currentCount = contributionMatrix[l][m].contributionCount;
            aliveNeighbours -= currentCount > 0 ? 1 : 0;

            if (currentCount > 0 && (aliveNeighbours < 2 || aliveNeighbours > 3)) // die off
                future[l][m] = { contributionCount: 0, date: contributionMatrix[l][m].date };
            else if (currentCount === 0 && aliveNeighbours === 3) { // spawn new cell
                future[l][m] = { contributionCount: determineNewCellCount(neighbors), date: contributionMatrix[l][m].date };
            } else
                future[l][m] = { contributionCount: currentCount, date: contributionMatrix[l][m].date };
        }
    }

    return future;
}


function determineNewCellCount(neighbors) {
    const colorCount = new Array(5).fill(0);
    neighbors.forEach(color => {
        colorCount[color]++;
    });

    // Check for the presence of a majority color with exactly two neighbors
    const majorityColor = colorCount.findIndex(count => count === 2);
    if (majorityColor !== -1) return majorityColor * 5 - 1;

    // If no majority, find the color that is not present in the 3-way tie
    const allColors = [1, 2, 3, 4]; // All possible colors
    const missingColor = allColors.find(color => colorCount[color] === 0);

    if (missingColor !== undefined) {
        return missingColor * 5 - 1;
    } else {
        // If no color is completely missing, return a default
        return 15;
    }
}

function createContributionMatrix(data, resetContributions = false) {
    const weeksData = data.data.user.contributionsCollection.contributionCalendar.weeks;
    const matrix = [];

    weeksData.forEach((week, weekIndex) => {
        const weekArray = []; 

        week.contributionDays.forEach(day => {
            weekArray.push({
                contributionCount: resetContributions ? 0 : day.contributionCount, // Set to 0 if resetContributions is true
                date: day.date
            });
        });

        matrix.push(weekArray);
    });

    return matrix;
}


function lightenColor(hex, percent) {
    if (hex === '#161b22'){
        return hex;
    }
    const num = parseInt(hex.slice(1), 16),
          amt = Math.round(2.55 * percent),
          R = (num >> 16) + amt,
          B = (num >> 8 & 0x00FF) + amt,
          G = (num & 0x0000FF) + amt;
    
    return '#' + (0x1000000 + (R < 255 ? R : 255) * 0x10000 + (B < 255 ? B : 255) * 0x100 + (G < 255 ? G : 255)).toString(16).slice(1);
}

function getColor(contributionCount) {
    if (contributionCount === 0) {
        return '#161b22';  // No contributions - gray
    } else if (contributionCount >= 15) {
        return '#39d1d3';  // Most contributions - lightest blue
    } else if (contributionCount >= 10) {
        return '#2570a5';  // High contributions - lighter blue
    } else if (contributionCount >= 5) {
        return '#00466e';  // Moderate contributions - medium blue
    } else {
        return '#0d3344';  // Fewest contributions (but not zero) - darkest blue
    }
}

function generateAnimatedSVGCM(contributionMatrices) {
    const cellSize = 9;
    const gap = 3;
    const legendGap = 5;
    const topMargin = 30;
    const leftMargin = 50;
    const cornerRadius = 2;
    const strokeWidth = 0.8;
    const backgroundColor = '#0d1118';
    const borderLightenPercent = 5;
    const animationSpeed = "0.4s";
    const timeMultiplier = 0.4;
    let svgContent = '';
    const maxWeeks = 53; // Assume all matrices have the same dimension
    const rightPadding = 10;
    const svgWidth = maxWeeks * (cellSize + gap) + leftMargin + rightPadding;
    const svgHeight = 7 * (cellSize + gap) + topMargin + 50;

    // Define styles and background
    svgContent += `<style>
        text { font-family: Arial, sans-serif; fill: #848d97; font-size: 12px; }
        .day-cell { stroke-width: ${strokeWidth}; }
        .day-label { font-family: Arial, sans-serif; fill: #c9d1d9; font-size: 12px; text-anchor: start; }
        .month-label { font-family: Arial, sans-serif; fill: #c9d1d9; font-size: 12px; }
        a:hover text { fill: #4494f8; }
    </style>`;
    //svgContent += `<rect x="0" y="0" width="${svgWidth + leftMargin}" height="${svgHeight}" fill="${backgroundColor}" />`;

    // Static day labels
    const dayLabels = ["Mon", "Wed", "Fri"];
    dayLabels.forEach((label, i) => {
        svgContent += `<text x="18" y="${topMargin + (cellSize + gap) * (1 + i * 2) + cellSize / 1.25}" class="day-label">${label}</text>`;
    });

    // Legend positioning and content
    const legendY = 7 * (cellSize + gap) + topMargin + 20; // Position for the legend below the grid

    const legendCounts = [0, 1, 5, 10, 15];
    const totalLegendWidth = legendCounts.length * cellSize + (legendCounts.length - 1) * legendGap;
    const rightMargin = 30; // Margin from the right edge of the SVG
    const shiftLeft = 30; // Amount to shift the whole legend to the left

    const startX = svgWidth - totalLegendWidth - rightMargin - shiftLeft - rightPadding;

    const textLessX = startX - legendGap - 25; // Subtracting estimated text width and a gap for "Less"
    const textMoreX = startX + totalLegendWidth + legendGap; // Positioned after the last cell plus a gap for "More"

    svgContent += `<a href="https://conwaylife.com/wiki/Colourised_Life#Quadlife"> <text x="${leftMargin}" y="${legendY}" class="legend-label">Quad Color Game of Life</text></a>`;
    // Append "Less" text
    svgContent += `<text x="${textLessX}" y="${legendY}" class="legend-label">Less</text>`;

    // Append cells for the legend
    legendCounts.forEach((count, index) => {
        const x = startX + index * (cellSize + legendGap); // Calculate x using the gap
        const color = getColor(count);
        const stroke = lightenColor(color, borderLightenPercent);
        svgContent += `<rect x="${x}" y="${legendY - 9}" width="${cellSize}" height="${cellSize}" fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}" rx="${cornerRadius}" ry="${cornerRadius}"></rect>`;
    });

    // Append "More" text
    svgContent += `<text x="${textMoreX}" y="${legendY}" class="legend-label">More</text>`;


    let lastMonth = -1; // Reset last month for new animation

    // Add month and day cells with animations
    for (let weekIndex = 0; weekIndex < maxWeeks; weekIndex++) {
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) { // Assumes 7 days per week
            const x = weekIndex * (cellSize + gap) + leftMargin;
            const y = dayIndex * (cellSize + gap) + topMargin;
            contributionMatrices.forEach((matrix, matrixIndex) => {
                const day = matrix[weekIndex]?.[dayIndex];
                if (day) {
                    // Add month labels at the start of each month
                    const month = new Date(day.date).getMonth();
                    if (month !== lastMonth && dayIndex === 0) {
                        const monthName = new Date(day.date).toLocaleString('default', { month: 'short' });
                        const monthLabelX = weekIndex * (cellSize + gap) + leftMargin;
                        svgContent += `<text x="${monthLabelX}" y="${topMargin - 5}" class="month-label">${monthName}</text>`;
                        lastMonth = month; // Update last month to current
                    }
                }
            });

        }
    }

    // Add month and day cells with animations
    for (let weekIndex = 0; weekIndex < maxWeeks; weekIndex++) {
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) { 
            // Only proceed if the day is present in at least one matrix
            const dayPresent = contributionMatrices.some(matrix => matrix[weekIndex] && matrix[weekIndex][dayIndex]);
            if (!dayPresent) {
                continue; // Skip rendering this cell if no data
            }
            const x = weekIndex * (cellSize + gap) + leftMargin;
            const y = dayIndex * (cellSize + gap) + topMargin;
            svgContent += `<rect x="${x}" y="${y}" width="${cellSize - strokeWidth}" height="${cellSize - strokeWidth}" stroke-width="${strokeWidth}" rx="${cornerRadius}" ry="${cornerRadius}" class="day-cell">`;

            contributionMatrices.forEach((matrix, matrixIndex) => {
                const day = matrix[weekIndex]?.[dayIndex];
                if (day) {
                    const color = getColor(day.contributionCount); 
                    const stroke = lightenColor(color, borderLightenPercent);
                    const animateBegin = (matrixIndex * timeMultiplier) + 's'; // Start time for this matrix's animation
                    svgContent += `<animate attributeName="fill" begin="${animateBegin}" dur="${animationSpeed}" fill="freeze" to="${color}" />`;
                    svgContent += `<animate attributeName="stroke" begin="${animateBegin}" dur="${animationSpeed}" fill="freeze" to="${stroke}" />`;
                }
            });

            svgContent += `</rect>`;
        }
    }

    return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
}

  retrieveContributionData(userName)
  .then(jsonData => {
    const grid = createContributionMatrix(jsonData);
    let nextGen = grid;
    const gens = new Array(3).fill(grid);
    const reset = createContributionMatrix(jsonData, true);
    for (let i = 0; i < generations; i++){
        nextGen = nextGeneration(nextGen, 53, 7);
        gens.push(nextGen);
    }
    gens.push(...Array(4).fill(reset));
    gens.push(grid);

    const timestamp = new Date().getTime();
    const filename = `github-contributions-gol-${timestamp}.svg`;
    const filePath = path.join('./build-dir', filename);

    // Write SVG with unique filename
    fs.writeFile(filePath, svgAnimated, (err) => {
        if (err) {
            console.error('Error writing SVG file:', err);
        } else {
            console.log(`SVG file has been saved as ${filename}.`);
        }
    });
  })
  .catch(error => {
    console.error('Failed to retrieve data:', error);
  });

