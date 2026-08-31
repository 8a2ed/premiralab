import { useEffect } from 'react';
import { api } from '../lib/api';

export default function MarketingPixels() {
  useEffect(() => {
    fetch('/api/public/marketing')
      .then(r => r.json())
      .then(data => {
        if (data.googleAnalyticsId) {
          const s = document.createElement('script');
          s.async = true;
          s.src = `https://www.googletagmanager.com/gtag/js?id=${data.googleAnalyticsId}`;
          document.head.appendChild(s);
          const s2 = document.createElement('script');
          s2.innerHTML = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${data.googleAnalyticsId}');`;
          document.head.appendChild(s2);
        }
        if (data.metaPixelId) {
          const s = document.createElement('script');
          s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${data.metaPixelId}');fbq('track', 'PageView');`;
          document.head.appendChild(s);
        }
        if (data.tiktokPixelId) {
          const s = document.createElement('script');
          s.innerHTML = `!function (w, d, t) { w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${data.tiktokPixelId}');ttq.page(); }(window, document, 'ttq');`;
          document.head.appendChild(s);
        }
        if (data.snapchatPixelId) {
          const s = document.createElement('script');
          s.innerHTML = `(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var p='script';var r=t.createElement(p);r.async=!0;r.src=n;var u=t.getElementsByTagName(p)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');snaptr('init', '${data.snapchatPixelId}');snaptr('track', 'PAGE_VIEW');`;
          document.head.appendChild(s);
        }
      })
      .catch(() => {});
  }, []);
  
  return null;
}
