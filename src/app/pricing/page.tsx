'use client'

// import { supabase } from '@/lib/supabase'

export default function PricingPage() {
  async function handleSubscribe(priceType: 'monthly' | 'annual') {
    // TODO: Uncomment when Stripe is configured
    // const { data: { user } } = await supabase.auth.getUser()
    // if (!user) {
    //   window.location.href = '/auth/login?redirect=/pricing'
    //   return
    // }
    //
    // const response = await fetch('/api/checkout', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ priceType, userId: user.id, email: user.email }),
    // })
    // const { url } = await response.json()
    // window.location.href = url

    alert('Stripe not yet configured. See .env.local.example for required keys.')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-amber-900 mb-4">FunHive Premium</h1>
        <p className="text-lg text-gray-600">
          Get more out of FunHive with an ad-free experience and exclusive features.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
        {/* Free Tier */}
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Free</h2>
          <p className="text-3xl font-bold text-gray-900 mb-1">$0</p>
          <p className="text-gray-500 mb-6">forever</p>
          <ul className="space-y-3 text-gray-700 mb-8">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              Browse all events and activities
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              Search and filter by location
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              Interactive map view
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              Save up to 10 favorites
            </li>
          </ul>
          <div className="text-center text-gray-400 font-medium">Current plan</div>
        </div>

        {/* Premium Tier */}
        <div className="bg-white rounded-xl border-2 border-amber-400 p-8 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            BEST VALUE
          </div>
          <h2 className="text-xl font-bold text-amber-900 mb-2">Premium</h2>
          <div className="mb-6">
            <p className="text-3xl font-bold text-amber-900">$2.99<span className="text-base font-normal text-gray-500">/mo</span></p>
            <p className="text-sm text-gray-500">or $24.99/year (save 30%)</p>
          </div>
          <ul className="space-y-3 text-gray-700 mb-8">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">&#10003;</span>
              Everything in Free
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">&#10003;</span>
              Ad-free experience
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">&#10003;</span>
              Unlimited favorites and lists
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">&#10003;</span>
              Weekly personalized email digest
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">&#10003;</span>
              Early access to new events (24hr)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">&#10003;</span>
              Write reviews and ratings
            </li>
          </ul>
          <div className="space-y-2">
            <button
              onClick={() => handleSubscribe('monthly')}
              className="w-full bg-amber-500 text-white py-3 rounded-lg font-semibold hover:bg-amber-600 transition"
            >
              Start Monthly — $2.99/mo
            </button>
            <button
              onClick={() => handleSubscribe('annual')}
              className="w-full border-2 border-amber-400 text-amber-700 py-3 rounded-lg font-semibold hover:bg-amber-50 transition"
            >
              Start Annual — $24.99/yr
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
