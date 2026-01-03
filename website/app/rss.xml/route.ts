const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cooksmartapp.com';

export const dynamic = 'force-static';

export function GET(): Response {
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Cook Smart Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Cooking tips, recipes, and meal planning advice from Cook Smart</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <item>
      <title><![CDATA[Welcome to Cook Smart]]></title>
      <link>${siteUrl}/blog/welcome</link>
      <guid isPermaLink="true">${siteUrl}/blog/welcome</guid>
      <description><![CDATA[Welcome to the Cook Smart blog! Stay tuned for cooking tips, recipes, and meal planning advice.]]></description>
      <pubDate>${new Date().toUTCString()}</pubDate>
      <author>Cook Smart Team</author>
      <category>Announcements</category>
    </item>
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
