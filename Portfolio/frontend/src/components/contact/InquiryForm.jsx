import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';
import { budgetOptions, contactMessages, serviceOptions } from '../../data/contact';
import { useContent } from '../../content/hooks';
import { submitInquiry } from '../../lib/contactApi';

const EMPTY = { name: '', email: '', company: '', service: '', budget: '', details: '', website: '' };
const FIELD_ORDER = ['name', 'email', 'company', 'service', 'budget', 'details'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DETAILS_MIN = 20;
const DETAILS_MAX = 5000;

const validate = (values) => {
  const errors = {};
  if (values.name.trim().length < 2) errors.name = 'Please enter your name.';
  if (!values.email.trim()) errors.email = 'Please enter your email.';
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Please enter a valid email address, like you@company.com.';
  if (!values.service) errors.service = 'Please choose what you need. "Something Else" is fine if you are unsure.';
  if (!values.details.trim()) errors.details = 'Please tell us a little about your project.';
  else if (values.details.trim().length < DETAILS_MIN) errors.details = `Please add a little more detail (at least ${DETAILS_MIN} characters).`;
  return errors;
};

const Field = ({ id, label, optional, error, hint, children }) => (
  <div className="contact-field" data-invalid={error ? 'true' : undefined}>
    <label htmlFor={id} className="contact-label">
      {label}
      {optional ? <span className="contact-optional">Optional</span> : <span className="contact-required" aria-hidden="true">*</span>}
    </label>
    {children}
    {hint && <p id={`${id}-hint`} className="contact-hint">{hint}</p>}
    {error && (
      <p id={`${id}-error`} className="contact-error">
        <AlertCircle size={14} aria-hidden="true" />
        {error}
      </p>
    )}
  </div>
);

export const InquiryForm = forwardRef(function InquiryForm(_, firstFieldRef) {
  const formId = useId();
  const { contact: contactDetails } = useContent();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [serverMessage, setServerMessage] = useState('');
  const submittingRef = useRef(false);
  const formRef = useRef(null);
  const successRef = useRef(null);
  const errorRef = useRef(null);

  const id = (name) => `${formId}-${name}`;

  useEffect(() => {
    if (status === 'success') successRef.current?.focus();
    if (status === 'error') errorRef.current?.focus();
  }, [status]);

  const focusFirstError = (fieldErrors) => {
    const first = FIELD_ORDER.find((name) => fieldErrors[name]);
    if (first) formRef.current?.elements.namedItem(first)?.focus();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    const next = { ...values, [name]: value };
    setValues(next);
    // Once a field has been visited, re-check it as the visitor types so errors clear promptly.
    if (touched[name]) setErrors((prev) => ({ ...prev, [name]: validate(next)[name] }));
  };

  const handleBlur = (event) => {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validate(values)[name] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const fieldErrors = validate(values);
    setTouched(Object.fromEntries(FIELD_ORDER.map((name) => [name, true])));
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) {
      focusFirstError(fieldErrors);
      return;
    }

    submittingRef.current = true;
    setStatus('submitting');
    setServerMessage('');
    try {
      const payload = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
      const result = await submitInquiry(payload);
      if (result.ok) {
        setStatus('success');
        return;
      }
      if (result.status === 400 && result.data && typeof result.data === 'object') {
        // The server re-validates; show its messages next to the matching fields.
        const serverErrors = Object.fromEntries(
          Object.entries(result.data)
            .filter(([key]) => FIELD_ORDER.includes(key))
            .map(([key, messages]) => [key, Array.isArray(messages) ? messages[0] : String(messages)]),
        );
        if (Object.keys(serverErrors).length) {
          setErrors(serverErrors);
          setStatus('idle');
          focusFirstError(serverErrors);
          return;
        }
      }
      // 502–504 come from a proxy/gateway that couldn't reach the API (e.g. Django not running).
      const unreachable = result.status >= 502 && result.status <= 504;
      setServerMessage(
        result.status === 429 ? contactMessages.rateLimited : unreachable ? contactMessages.network : contactMessages.error,
      );
      setStatus('error');
    } catch {
      setServerMessage(contactMessages.network);
      setStatus('error');
    } finally {
      submittingRef.current = false;
    }
  };

  const reset = () => {
    setValues(EMPTY);
    setErrors({});
    setTouched({});
    setStatus('idle');
    requestAnimationFrame(() => firstFieldRef?.current?.focus());
  };

  const describedBy = (name, hasHint) =>
    [errors[name] && `${id(name)}-error`, hasHint && `${id(name)}-hint`].filter(Boolean).join(' ') || undefined;

  const inputProps = (name, hasHint = false) => ({
    id: id(name),
    name,
    value: values[name],
    onChange: handleChange,
    onBlur: handleBlur,
    'aria-invalid': errors[name] ? 'true' : undefined,
    'aria-describedby': describedBy(name, hasHint),
  });

  if (status === 'success') {
    return (
      <div className="contact-success" role="status">
        <CheckCircle2 className="contact-success-icon" aria-hidden="true" />
        <h2 ref={successRef} tabIndex={-1} className="contact-success-title">Inquiry received</h2>
        <p className="contact-success-copy">{contactMessages.success}</p>
        <button type="button" onClick={reset} className="contact-link-button">
          Send another inquiry
        </button>
      </div>
    );
  }

  const submitting = status === 'submitting';

  return (
    <form ref={formRef} className="contact-form" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
      <div className="contact-form-head">
        <p className="contact-form-kicker">Project inquiry</p>
        <p className="contact-form-note"><span className="contact-required" aria-hidden="true">*</span> Required</p>
      </div>

      <div className="contact-form-grid">
        <Field id={id('name')} label="Full Name" error={errors.name}>
          <input ref={firstFieldRef} {...inputProps('name')} type="text" autoComplete="name" placeholder="Your name" maxLength={120} required className="contact-input" />
        </Field>

        <Field id={id('email')} label="Work Email" error={errors.email}>
          <input {...inputProps('email')} type="email" inputMode="email" autoComplete="email" placeholder="you@company.com" maxLength={254} required className="contact-input" />
        </Field>

        <Field id={id('company')} label="Company or Business" optional error={errors.company}>
          <input {...inputProps('company')} type="text" autoComplete="organization" placeholder="Company name, if applicable" maxLength={160} className="contact-input" />
        </Field>

        <Field id={id('service')} label="What Do You Need?" error={errors.service}>
          <div className="contact-select-wrap">
            <select {...inputProps('service')} required className="contact-input contact-select" data-empty={values.service ? undefined : 'true'}>
              <option value="" disabled>Choose a service</option>
              {serviceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <ChevronDown size={16} className="contact-select-icon" aria-hidden="true" />
          </div>
        </Field>
      </div>

      <fieldset className="contact-budget" aria-describedby={id('budget-hint')}>
        <legend className="contact-label">
          Estimated Budget <span className="contact-optional">Optional</span>
        </legend>
        <p id={id('budget-hint')} className="contact-hint contact-budget-hint">A rough range helps us suggest the right approach. Skip it if you&rsquo;re not sure.</p>
        <div className="contact-budget-options">
          {budgetOptions.map((option) => (
            <label key={option.value} className="contact-chip">
              <input
                type="radio"
                name="budget"
                value={option.value}
                checked={values.budget === option.value}
                onChange={handleChange}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        id={id('details')}
        label="Project Details"
        error={errors.details}
        hint="Not sure about the technical details? Just describe your idea in your own words."
      >
        <textarea
          {...inputProps('details', true)}
          rows={6}
          maxLength={DETAILS_MAX}
          placeholder="Tell me about your idea, the problem you want to solve, or the features you need..."
          required
          className="contact-input contact-textarea"
        />
      </Field>

      {/* Honeypot: invisible to people and skipped by assistive tech; bots that fill it are ignored. */}
      <div className="contact-honeypot" aria-hidden="true">
        <label htmlFor={id('website')}>Website</label>
        <input id={id('website')} name="website" type="text" tabIndex={-1} autoComplete="off" value={values.website} onChange={handleChange} />
      </div>

      {status === 'error' && (
        <div ref={errorRef} tabIndex={-1} className="contact-alert" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <p>
            {serverMessage}{' '}
            You can also email <a href={`mailto:${contactDetails.email}`}>{contactDetails.email}</a>.
          </p>
        </div>
      )}

      <div className="contact-submit-row">
        <button type="submit" className="contact-submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 size={18} className="contact-spinner" aria-hidden="true" />
              Sending…
            </>
          ) : (
            <>
              Send Project Inquiry
              <ArrowRight size={18} aria-hidden="true" />
            </>
          )}
        </button>
        <p className="contact-submit-note">Your details are only used to reply to your inquiry.</p>
      </div>
      <p className="sr-only" aria-live="polite">{submitting ? 'Sending your inquiry…' : ''}</p>
    </form>
  );
});
