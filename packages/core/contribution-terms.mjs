// The owner-approved, versioned agreement presented by the campaign before
// Stripe Checkout. Do not present a general-election gift as undesignated.
export const CONTRIBUTION_TERMS_VERSION='2026-10-13-general-v1';
export const ONLINE_DONATION_ELECTION='general';
export const CONTRIBUTION_TERMS_PATH='/donate/terms';

export function contributionTermsHtml(){
 return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">'+
  '<title>Contribution terms | Galinsky 2028</title>'+
  '<link rel="stylesheet" href="/assets/design.css"><link rel="stylesheet" href="/assets/site.css">'+
  '</head><body><main class="wrap contribution-terms" id="main">'+
  '<p><a class="terms-back" href="/donate/stripe">&larr; Return to contribution form</a></p>'+
  '<h1>Contribution terms</h1>'+
  '<p class="terms-intro">Please review these terms before making a contribution to Phillip Galinsky for America.</p>'+
  '<h2>Eligibility and source of funds</h2>'+
  '<p>By agreeing and proceeding to payment, I certify that all of the following are true:</p>'+
  '<ul>'+
  '<li>I am a U.S. citizen or lawfully admitted permanent resident (i.e., green card holder).</li>'+
  '<li>I contribute from my own funds. I am not contributing funds provided by another person or entity.</li>'+
  '<li>I am at least 18 years old.</li>'+
  '<li>I am not a federal contractor.</li>'+
  '<li>I am making this contribution with my personal credit card, not a corporate or business credit card or a card issued to another person.</li>'+
  '</ul>'+
  '<p>Phillip Galinsky for America does not accept contributions from PACs, corporations, unions, federal contractors, national banks, FARA registrants, or foreign nationals.</p>'+
  '<h2>Election designation and limits</h2>'+
  '<p><strong>My contribution is designated for the 2028 general election for President of the United States.</strong> I understand that I may not change this designation by simply selecting another payment amount. Any legally permitted redesignation must comply with applicable federal election rules.</p>'+
  '<p>I confirm that this contribution, combined with my other contributions to the committee for the same election through any payment method, does not exceed the applicable federal contribution limit. The campaign must separately track aggregate contributions and may refund or seek a lawful redesignation of contributions it cannot accept.</p>'+
  '<h2>Reporting and payment</h2>'+
  '<p><strong>Federal law requires the committee to use its best efforts to collect and report the name, mailing address, occupation and employer of individuals whose contributions exceed $200 in an election cycle.</strong> The campaign requests these details in its secure payment process; required information may appear in public FEC reports.</p>'+
  '<p>This is a one-time contribution. Recurring payments are not authorized. Card information is entered on Stripe’s secure checkout, not on the campaign website.</p>'+
  '<p>Contributions to Phillip Galinsky for America are not deductible as charitable contributions for federal income tax purposes.</p>'+
  '<p>Paid for by Phillip Galinsky for America.</p>'+
  '<p class="terms-revision">Terms version '+CONTRIBUTION_TERMS_VERSION+'. This agreement does not authorize contributions prohibited by federal law.</p>'+
  '<p><a class="terms-back" href="/donate/stripe">&larr; Return to contribution form</a></p>'+
  '</main></body></html>';
}
