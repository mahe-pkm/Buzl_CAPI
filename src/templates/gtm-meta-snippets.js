/**
 * GTM & Meta Pixel Snippet Generators
 */

const HEAD_START_MARKER = '<!-- BUZL_TRACKING_HEAD_START -->';
const HEAD_END_MARKER = '<!-- BUZL_TRACKING_HEAD_END -->';
const BODY_START_MARKER = '<!-- BUZL_TRACKING_BODY_START -->';
const BODY_END_MARKER = '<!-- BUZL_TRACKING_BODY_END -->';

/**
 * Generate GTM & Meta Pixel head snippet
 */
function generateHeadSnippet(config) {
  const gtmId = (config.gtmId || '').trim();
  const metaPixelId = (config.metaPixelId || '').trim();
  const enableDeferred = config.enableDeferred !== false;

  const lines = [HEAD_START_MARKER];

  // Preconnects for performance
  if (gtmId || metaPixelId) {
    lines.push('  <!-- Performance Preconnects for Tracking -->');
    if (gtmId) {
      lines.push('  <link rel="preconnect" href="https://www.googletagmanager.com" crossorigin>');
    }
    if (metaPixelId) {
      lines.push('  <link rel="preconnect" href="https://connect.facebook.net" crossorigin>');
    }
  }

  if (enableDeferred) {
    lines.push('  <!-- Buzl Deferred Tracking: GTM & Meta Pixel initialized on first interaction or timeout -->');
    lines.push('  <script>');
    lines.push('    (function() {');
    lines.push('      var initialized = false;');
    lines.push('      function initTrackers() {');
    lines.push('        if (initialized) return;');
    lines.push('        initialized = true;');
    lines.push('        window.removeEventListener("scroll", initTrackers);');
    lines.push('        window.removeEventListener("mousemove", initTrackers);');
    lines.push('        window.removeEventListener("touchstart", initTrackers);');
    lines.push('');

    if (gtmId) {
      lines.push('        // Google Tag Manager');
      lines.push('        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":');
      lines.push('        new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],');
      lines.push('        j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src=');
      lines.push('        "https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);');
      lines.push(`        })(window,document,"script","dataLayer","${gtmId}");`);
      lines.push('');
    }

    if (metaPixelId) {
      lines.push('        // Meta Pixel Code');
      lines.push('        !function(f,b,e,v,n,t,s)');
      lines.push('        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?');
      lines.push('        n.callMethod.apply(n,arguments):n.queue.push(arguments)};');
      lines.push('        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";');
      lines.push('        n.queue=[];t=b.createElement(e);t.async=!0;');
      lines.push('        t.src=v;s=b.getElementsByTagName(e)[0];');
      lines.push('        s.parentNode.insertBefore(t,s)}(window, document,"script",');
      lines.push('        "https://connect.facebook.net/en_US/fbevents.js");');
      lines.push(`        fbq("init", "${metaPixelId}");`);
      lines.push('        fbq("track", "PageView");');
      lines.push('');
    }

    lines.push('      }');
    lines.push('');
    lines.push('      // Debug override: trigger instantly if GTM preview / debug active');
    lines.push('      var url = window.location.href;');
    lines.push('      if (url.indexOf("gtm_debug=") !== -1 || url.indexOf("gtm_preview=") !== -1 || url.indexOf("gtm_auth=") !== -1) {');
    lines.push('        initTrackers();');
    lines.push('      } else {');
    lines.push('        window.addEventListener("load", function() { setTimeout(initTrackers, 2000); });');
    lines.push('        window.addEventListener("scroll", initTrackers, { passive: true });');
    lines.push('        window.addEventListener("mousemove", initTrackers, { passive: true });');
    lines.push('        window.addEventListener("touchstart", initTrackers, { passive: true });');
    lines.push('      }');
    lines.push('    })();');
    lines.push('  </script>');
  } else {
    // Standard synchronous loading
    if (gtmId) {
      lines.push('  <!-- Google Tag Manager -->');
      lines.push('  <script>');
      lines.push('    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":');
      lines.push('    new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],');
      lines.push('    j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src=');
      lines.push('    "https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);');
      lines.push(`    })(window,document,"script","dataLayer","${gtmId}");`);
      lines.push('  </script>');
    }

    if (metaPixelId) {
      lines.push('  <!-- Meta Pixel Code -->');
      lines.push('  <script>');
      lines.push('    !function(f,b,e,v,n,t,s)');
      lines.push('    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?');
      lines.push('    n.callMethod.apply(n,arguments):n.queue.push(arguments)};');
      lines.push('    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";');
      lines.push('    n.queue=[];t=b.createElement(e);t.async=!0;');
      lines.push('    t.src=v;s=b.getElementsByTagName(e)[0];');
      lines.push('    s.parentNode.insertBefore(t,s)}(window, document,"script",');
      lines.push('    "https://connect.facebook.net/en_US/fbevents.js");');
      lines.push(`    fbq("init", "${metaPixelId}");`);
      lines.push('    fbq("track", "PageView");');
      lines.push('  </script>');
    }
  }

  lines.push(HEAD_END_MARKER);
  return lines.join('\n');
}

/**
 * Generate noscript tags for opening <body>
 */
function generateBodySnippet(config) {
  const gtmId = (config.gtmId || '').trim();
  const metaPixelId = (config.metaPixelId || '').trim();

  const lines = [BODY_START_MARKER];

  if (gtmId) {
    lines.push('  <!-- Google Tag Manager (noscript) -->');
    lines.push(`  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"`);
    lines.push('  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>');
  }

  if (metaPixelId) {
    lines.push('  <!-- Meta Pixel (noscript) -->');
    lines.push('  <noscript><img height="1" width="1" style="display:none"');
    lines.push(`  src="https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1" /></noscript>`);
  }

  lines.push(BODY_END_MARKER);
  return lines.join('\n');
}

module.exports = {
  HEAD_START_MARKER,
  HEAD_END_MARKER,
  BODY_START_MARKER,
  BODY_END_MARKER,
  generateHeadSnippet,
  generateBodySnippet
};
