import { NextResponse } from "next/server";
import { getSessionCustomerId } from "@/lib/session";
import { customerService } from "@/services/customerService";
import { rewardService } from "@/services/rewardService";
import { subscriberRepository } from "@/repositories/subscriberRepository";

// App-only convenience endpoint (not part of the formal integration
// contract): lets the browser learn "who am I" from its session cookie on
// load/refresh, so the Coin balance and identity survive a page reload
// without relying on localStorage as the source of truth.
export async function GET() {
  const customerId = await getSessionCustomerId();
  if (!customerId) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  const customer = customerService.getByCustomerId(customerId);
  if (!customer) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  const subscribers = subscriberRepository.findByCustomerId(customerId);

  return NextResponse.json({
    authenticated: true,
    customer_id: customer.customerId,
    full_name: customer.fullName,
    email: customer.email,
    referral_code: customer.referralCode,
    coin_balance: rewardService.getBalance(customerId),
    subscribers: subscribers.map((s) => ({
      subscriber_id: s.subscriberId,
      msisdn: s.normalizedMsisdn,
      status: s.status,
    })),
  });
}
