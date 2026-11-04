// Shared helper for the check scripts: after a new player is created, turn off the beginner guide
// and the Daily Rewards panel that opens by itself, so they don't block clicks.
// Only touches this test player's browser session; it marks today's panel as already shown.
module.exports = async function quiet(p) {
  const hush = () => p.evaluate(() => {
    const B = window.EmberBridge; if (!B) return;
    B.state.guidedTour = { active: false };
    const d = new Date(), day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const daily = window.EmberDaily?.daily?.(); if (daily) daily.autoDay = day;
    document.querySelectorAll('#guidedTour, #dailyPanel').forEach(e => e.remove());
    B.save();
  });
  await hush();
  // The panel opens ~0.6 s after Home appears, so check once more after that.
  await p.waitForTimeout(900); await hush();
};
