// Contact page content. Edit freely: anything left as `null` is hidden on the page.

export const contactDetails = {
  // Shown on the Contact page, footer and homepage CTA. Change it here only.
  email: 'devsphere1130@gmail.com',
  // PLACEHOLDER: add a professional phone number, e.g. '+91 98765 43210', to show a call link.
  phone: null,
  location: 'Based in India · Working worldwide',
  availability: 'Available for new projects',
};

// PLACEHOLDER: add real profile URLs; links stay hidden while `href` is null.
export const socialLinks = [
  { label: 'LinkedIn', href: null },
  { label: 'GitHub', href: null },
];

// `value` keys must match ContactInquiry.SERVICE_CHOICES in the Django backend.
export const serviceOptions = [
  { value: 'web-app', label: 'Website or Web Application' },
  { value: 'saas', label: 'SaaS Product' },
  { value: 'business-software', label: 'Business Software' },
  { value: 'frontend', label: 'Frontend Development' },
  { value: 'backend-api', label: 'Backend or API Development' },
  { value: 'automation', label: 'Automation' },
  { value: 'modernization', label: 'System Modernization' },
  { value: 'ui-ux', label: 'UI/UX Design' },
  { value: 'qa', label: 'Testing and Quality Assurance' },
  { value: 'other', label: 'Something Else' },
];

// `value` keys must match ContactInquiry.BUDGET_CHOICES in the Django backend.
export const budgetOptions = [
  { value: 'undecided', label: 'Not decided yet' },
  { value: 'under-500', label: 'Under $500' },
  { value: '500-1500', label: '$500–$1,500' },
  { value: '1500-5000', label: '$1,500–$5,000' },
  { value: '5000-plus', label: '$5,000+' },
  { value: 'discuss', label: "Let's discuss" },
];

export const contactMessages = {
  success:
    "Thanks for reaching out! Your project inquiry has been submitted successfully. I'll review the details and follow up using the contact information you provided.",
  error: "Something went wrong and your inquiry wasn't sent. Your details are still here, so please try again in a moment.",
  network: "We couldn't reach the server, so your inquiry wasn't sent. Check your connection and try again. Your details are still here.",
  rateLimited: "You've sent several inquiries in a short time. Please wait a little while before trying again, or email us directly.",
};

export const journeySteps = ['Idea', 'Design', 'Development', 'Delivery'];
