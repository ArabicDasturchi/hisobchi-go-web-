/**
 * Ro'yxatdan o'tish xatolari: supabase-js'ning haqiqiy xato sinflari bilan (AuthApiError, AuthRetryableFetchError,
 * AuthWeakPasswordError) — matn emas, `code`/`status` bo'yicha tasniflanishi tekshiriladi.
 */
import { AuthApiError, AuthRetryableFetchError, AuthWeakPasswordError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { classifySignupError } from '@/lib/authErrors';

const api = (message: string, status: number, code?: string) => new AuthApiError(message, status, code);

describe('classifySignupError', () => {
  it("loyiha bo'yicha email yuborish limiti (asosiy sabab) — aniq xabar, kod ko'rsatiladi, avtomatik qayta urinish yo'q", () => {
    const r = classifySignupError(api('email rate limit exceeded', 429, 'over_email_send_rate_limit'));
    expect(r.kind).toBe('email_quota');
    expect(r.code).toBe('over_email_send_rate_limit');
    expect(r.retryable).toBe(false);
    expect(r.message).toMatch(/limiti vaqtincha tugagan/);
  });

  it('bitta manzil uchun soniyali kutish', () => {
    const r = classifySignupError(api('For security purposes, you can only request this after 42 seconds.', 429, 'over_email_send_rate_limit'));
    expect(r.kind).toBe('email_cooldown');
    expect(r.message).toMatch(/42 soniyadan keyin/);
    expect(r.retryable).toBe(false);
  });

  it("juda ko'p so'rov (IP bo'yicha)", () => {
    expect(classifySignupError(api('Request rate limit reached', 429, 'over_request_rate_limit')).kind).toBe('too_many_requests');
    expect(classifySignupError(api('Too Many Requests', 429)).kind).toBe('too_many_requests');
  });

  it("mavjud email, noto'g'ri email, zaif parol", () => {
    expect(classifySignupError(api('User already registered', 422, 'user_already_exists')).kind).toBe('already_registered');
    expect(classifySignupError(api('Email address "a@b" is invalid', 400, 'email_address_invalid')).kind).toBe('invalid_email');
    const weak = classifySignupError(new AuthWeakPasswordError('Password is known to be weak', 422, ['pwned']));
    expect(weak.kind).toBe('weak_password');
    expect(weak.message).toMatch(/ochiq bazalarda/);
  });

  it('pochta xizmati: ruxsat etilmagan manzil va SMTP xatosi', () => {
    expect(classifySignupError(api('Email address "x@y.uz" cannot be used as it is not authorized', 400, 'email_address_not_authorized')).kind).toBe('email_not_authorized');
    expect(classifySignupError(api('Error sending confirmation email', 500, 'unexpected_failure')).kind).toBe('email_send_failed');
  });

  it("tarmoq uzilishi — foydalanuvchi o'zi qayta bosishi mumkin", () => {
    const r = classifySignupError(new AuthRetryableFetchError('Failed to fetch', 0));
    expect(r.kind).toBe('network');
    expect(r.retryable).toBe(true);
  });

  it("kutilmagan server xatosi va o'chirilgan ro'yxatdan o'tish", () => {
    expect(classifySignupError(api('Database error saving new user', 500, 'unexpected_failure')).kind).toBe('server');
    expect(classifySignupError(api('Signups not allowed for this instance', 422, 'signup_disabled')).kind).toBe('signup_disabled');
  });
});
