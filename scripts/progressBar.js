// scripts/progressBar.js

function getThemeColors() {
  const theme = document.body.dataset.theme || "default";

  switch (theme.toLowerCase()) {
    case "fantasy":
      return {
        scrollColor: "#8a2be2",
        genColor: "#ffd700",
      };
    case "cyberpunk":
      return {
        scrollColor: "#ff00c8",
        genColor: "#00faff",
      };
    case "scifi":
    case "sci-fi":
      return {
        scrollColor: "#00bfff",
        genColor: "#00ff88",
      };
    default:
      return {
        scrollColor: "#888",
        genColor: "#00ffc8",
      };
  }
}

// Scroll Progress Bar
export function initScrollProgressBar() {
  const progressBar = document.getElementById("scrollProgressBar");
  if (!progressBar) return;

  const { scrollColor } = getThemeColors();
  progressBar.style.backgroundColor = scrollColor;

  window.addEventListener("scroll", () => {
    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (scrollTop / scrollHeight) * 100;
    progressBar.style.width = scrolled + "%";
  });
}

// Generation Progress Bar
export function showGenerationProgress(duration = 2000) {
  const progressBar = document.getElementById("genProgressBar");
  if (!progressBar) return;

  const { genColor } = getThemeColors();
  progressBar.style.backgroundColor = genColor;
  progressBar.style.width = "0%";
  progressBar.style.display = "block";

  let progress = 0;
  const interval = 100;
  const step = (interval / duration) * 100;

  const progressInterval = setInterval(() => {
    progress += step;
    if (progress >= 100) {
      clearInterval(progressInterval);
      progressBar.style.width = "100%";
      setTimeout(() => {
        progressBar.style.display = "none";
      }, 500);
    } else {
      progressBar.style.width = `${progress}%`;
    }
  }, interval);
}
