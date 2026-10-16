// Shared presentation only: every actual campaign palette is database data.
export const CAMPAIGN_PRESENTATION_CSS=`
html[data-campaign]{--blue:var(--campaign-secondary);--red:var(--campaign-primary);--ink:var(--campaign-text);--muted:var(--campaign-muted-text);--line:var(--campaign-border);--paper:var(--campaign-surface)}
html[data-campaign] body{background:var(--campaign-background);color:var(--campaign-text)}
html[data-campaign] p{color:var(--campaign-muted-text)}
html[data-campaign] :is(h1,h2,h3,p,.tagline,.story-quote,.debt-callout){overflow-wrap:anywhere}
html[data-campaign] :is(.header,.issue-card,.issue-wide,.donation-widget,.donate-form,.policy-tabs,.role-tile,.lane,.signup,.policy-sidebar .box){background:var(--campaign-surface);color:var(--campaign-text);border-color:var(--campaign-border)}
html[data-campaign] .hero{background:linear-gradient(104deg,var(--campaign-background) 33%,var(--campaign-surface))}
html[data-campaign] .eyebrow,html[data-campaign] .hero h1 .red{color:var(--campaign-accent-text)}
html[data-campaign] :is(.philosophy .lead,.debt-callout,.story-quote,.issue-wide .tagline,.policy-hero .tagline,.eligibility,.committee-copy){color:var(--campaign-text)}
html[data-campaign] :is(.textlink,.btn.outline){color:var(--campaign-link)}
html[data-campaign] :is(.topline,.promise-strip,.join-banner,.footer,.policy-sidebar .bluebox,.policy-bottom){background:var(--campaign-secondary);color:var(--campaign-secondary-text)}
html[data-campaign] :is(.topline,.promise-strip,.join-banner,.footer,.bluebox,.policy-bottom) :is(p,.eyebrow,.footer-bottom){color:var(--campaign-secondary-text)}
html[data-campaign] :is(.topline,.promise-strip,.join-banner,.footer,.bluebox,.policy-bottom) :focus-visible{outline-color:var(--campaign-secondary-text)}
html[data-campaign] .topline{text-transform:uppercase}
html[data-campaign] .btn{background:var(--campaign-primary);color:var(--campaign-primary-text)}
html[data-campaign] .btn:hover{background:var(--campaign-primary)}
html[data-campaign] .btn.blue{background:var(--campaign-secondary);color:var(--campaign-secondary-text)}
html[data-campaign] .btn.white{background:var(--campaign-surface);color:var(--campaign-link)}
html[data-campaign] .btn.outline{background:transparent;border-color:var(--campaign-input-border)}
html[data-campaign] :is(.amount,.frequency button,input,select,textarea,.mobile-menu){background:var(--campaign-surface);color:var(--campaign-text);border-color:var(--campaign-input-border)}
html[data-campaign] :is(.frequency button.active,.amount.active){background:var(--campaign-secondary);color:var(--campaign-secondary-text);border-color:var(--campaign-secondary)}
html[data-campaign] :is(a,button,input,select,textarea,summary):focus-visible{outline-color:var(--campaign-focus)}
html[data-campaign] .pill:not(.green):not(.amber):not(.red){background:var(--campaign-surface);color:var(--campaign-text)}
html[data-campaign-long-heading="true"] .hero{height:auto;min-height:696px}
html[data-campaign-long-heading="true"] .hero .wrap{height:auto}
html[data-campaign-long-heading="true"] .hero-copy{padding-bottom:60px}
html[data-campaign-long-heading="true"] .hero h1{font-size:clamp(42px,5.8vw,78px);line-height:1.04;letter-spacing:-.05em}
html[data-campaign-mode-enabled="true"] .header{height:auto}
html[data-campaign-mode-enabled="true"] .header .nav{height:92px}
.campaign-appearance{display:flex;justify-content:flex-end;align-items:center;gap:10px;max-width:1240px;width:calc(100% - 112px);margin:0 auto;padding:0 0 12px;font-size:12px}
.campaign-appearance label{display:flex;align-items:center;gap:8px}
.campaign-appearance select,.campaign-appearance button{border:1px solid var(--campaign-input-border);padding:6px 10px;font:inherit;min-height:36px}
.campaign-appearance button{background:var(--campaign-secondary);color:var(--campaign-secondary-text)}
@media(max-width:780px){
 .campaign-appearance{width:calc(100% - 32px)}
 html[data-campaign-mode-enabled="true"] .header .nav{height:76px}
 html[data-campaign] .header .navlinks{top:100%;background:var(--campaign-surface);color:var(--campaign-text)}
 html[data-campaign] .hero{height:auto;min-height:0;display:flex;flex-direction:column}
 html[data-campaign] .hero .wrap{order:1;height:auto}
 html[data-campaign] .hero .hero-copy{padding-top:38px;padding-bottom:24px}
 html[data-campaign] .hero .candidate{order:2;position:relative;right:auto;bottom:auto;top:auto;align-self:center;width:min(100%,400px);max-width:100%;height:auto;margin:0;animation:none;transform:none}
 html[data-campaign] .hero .flag-canvas{top:auto;bottom:0;height:440px}
 html[data-campaign] .hero h1{font-size:clamp(44px,10.6vw,73px);letter-spacing:-.05em}
 html[data-campaign-long-heading="true"] .hero h1{font-size:clamp(40px,8.5vw,64px);line-height:1.04}
}
`;
