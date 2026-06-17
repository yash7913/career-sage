# ── Currency Service ─────────────────────────────────────────
# Hardcoded rates vs USD — refresh weekly
# All conversions go through USD as the base unit

RATES_TO_USD = {
    "USD": 1.0,
    "INR": 1 / 83.5,      # ₹83.5 = $1
    "GBP": 1.27,           # £1 = $1.27
    "SGD": 0.74,           # S$1 = $0.74
    "CAD": 0.73,           # C$1 = $0.73
    "AUD": 0.65,           # A$1 = $0.65
    "AED": 0.27,           # AED1 = $0.27
    "EUR": 1.08,           # €1 = $1.08
}

CURRENCY_SYMBOLS = {
    "USD": "$",
    "INR": "₹",
    "GBP": "£",
    "SGD": "S$",
    "CAD": "C$",
    "AUD": "A$",
    "AED": "AED ",
    "EUR": "€",
}

CURRENCY_LABELS = {
    "USD": "US Dollar",
    "INR": "Indian Rupee (LPA)",
    "GBP": "British Pound",
    "SGD": "Singapore Dollar",
    "CAD": "Canadian Dollar",
    "AUD": "Australian Dollar",
    "AED": "UAE Dirham",
    "EUR": "Euro",
}

# Whether currency is expressed in thousands (USD, GBP etc)
# or lakhs (INR) or standard units
CURRENCY_UNIT = {
    "USD": "thousands",   # $180,000 = $180K
    "INR": "lakhs",       # ₹50,00,000 = ₹50L
    "GBP": "thousands",
    "SGD": "thousands",
    "CAD": "thousands",
    "AUD": "thousands",
    "AED": "thousands",
    "EUR": "thousands",
}

# Market-specific compensation ranges for Technical PM Senior level
# Used as base for scaling other levels and cohorts
# All values in local currency units (thousands for USD/GBP etc, lakhs for INR)
MARKET_COMP_RANGES = {
    "India": {
        "currency": "INR",
        "Technical PM": {
            "junior":         {"low": 12,  "mid": 18,  "high": 25},
            "mid":            {"low": 20,  "mid": 30,  "high": 42},
            "senior":         {"low": 35,  "mid": 50,  "high": 70},
            "senior_manager": {"low": 50,  "mid": 70,  "high": 95},
            "director":       {"low": 70,  "mid": 95,  "high": 130},
            "vp":             {"low": 100, "mid": 140, "high": 200},
        },
        "Data Scientist": {
            "junior":         {"low": 10,  "mid": 16,  "high": 22},
            "mid":            {"low": 18,  "mid": 28,  "high": 40},
            "senior":         {"low": 30,  "mid": 45,  "high": 65},
            "senior_manager": {"low": 45,  "mid": 65,  "high": 90},
            "director":       {"low": 65,  "mid": 90,  "high": 125},
            "vp":             {"low": 90,  "mid": 130, "high": 180},
        },
        "ML Engineer": {
            "junior":         {"low": 12,  "mid": 18,  "high": 26},
            "mid":            {"low": 22,  "mid": 32,  "high": 46},
            "senior":         {"low": 38,  "mid": 55,  "high": 80},
            "senior_manager": {"low": 55,  "mid": 78,  "high": 110},
            "director":       {"low": 80,  "mid": 110, "high": 150},
            "vp":             {"low": 110, "mid": 155, "high": 220},
        },
        "Full-Stack Engineer": {
            "junior":         {"low": 8,   "mid": 14,  "high": 20},
            "mid":            {"low": 16,  "mid": 24,  "high": 35},
            "senior":         {"low": 28,  "mid": 42,  "high": 60},
            "senior_manager": {"low": 42,  "mid": 60,  "high": 85},
            "director":       {"low": 60,  "mid": 85,  "high": 120},
            "vp":             {"low": 85,  "mid": 120, "high": 170},
        },
    },
    "US": {
        "currency": "USD",
        "Technical PM": {
            "junior":         {"low": 90,  "mid": 120, "high": 150},
            "mid":            {"low": 130, "mid": 165, "high": 200},
            "senior":         {"low": 175, "mid": 220, "high": 280},
            "senior_manager": {"low": 220, "mid": 270, "high": 340},
            "director":       {"low": 280, "mid": 340, "high": 420},
            "vp":             {"low": 350, "mid": 450, "high": 600},
        },
        "Data Scientist": {
            "junior":         {"low": 85,  "mid": 110, "high": 140},
            "mid":            {"low": 120, "mid": 155, "high": 195},
            "senior":         {"low": 165, "mid": 210, "high": 265},
            "senior_manager": {"low": 210, "mid": 260, "high": 320},
            "director":       {"low": 270, "mid": 330, "high": 400},
            "vp":             {"low": 340, "mid": 430, "high": 580},
        },
        "ML Engineer": {
            "junior":         {"low": 100, "mid": 130, "high": 165},
            "mid":            {"low": 140, "mid": 180, "high": 225},
            "senior":         {"low": 190, "mid": 240, "high": 300},
            "senior_manager": {"low": 240, "mid": 295, "high": 370},
            "director":       {"low": 300, "mid": 370, "high": 460},
            "vp":             {"low": 380, "mid": 480, "high": 640},
        },
        "Full-Stack Engineer": {
            "junior":         {"low": 85,  "mid": 110, "high": 140},
            "mid":            {"low": 120, "mid": 155, "high": 195},
            "senior":         {"low": 165, "mid": 205, "high": 255},
            "senior_manager": {"low": 205, "mid": 250, "high": 310},
            "director":       {"low": 255, "mid": 310, "high": 385},
            "vp":             {"low": 320, "mid": 400, "high": 530},
        },
    },
    "UK": {
        "currency": "GBP",
        "Technical PM": {
            "junior":         {"low": 45,  "mid": 58,  "high": 72},
            "mid":            {"low": 60,  "mid": 78,  "high": 98},
            "senior":         {"low": 80,  "mid": 105, "high": 135},
            "senior_manager": {"low": 105, "mid": 135, "high": 170},
            "director":       {"low": 135, "mid": 170, "high": 215},
            "vp":             {"low": 170, "mid": 220, "high": 300},
        },
        "Data Scientist": {
            "junior":         {"low": 38,  "mid": 50,  "high": 63},
            "mid":            {"low": 52,  "mid": 68,  "high": 86},
            "senior":         {"low": 70,  "mid": 92,  "high": 118},
            "senior_manager": {"low": 92,  "mid": 120, "high": 152},
            "director":       {"low": 120, "mid": 155, "high": 195},
            "vp":             {"low": 155, "mid": 200, "high": 270},
        },
        "ML Engineer": {
            "junior":         {"low": 42,  "mid": 55,  "high": 70},
            "mid":            {"low": 58,  "mid": 76,  "high": 96},
            "senior":         {"low": 78,  "mid": 102, "high": 130},
            "senior_manager": {"low": 100, "mid": 130, "high": 165},
            "director":       {"low": 130, "mid": 165, "high": 210},
            "vp":             {"low": 165, "mid": 215, "high": 290},
        },
        "Full-Stack Engineer": {
            "junior":         {"low": 35,  "mid": 46,  "high": 58},
            "mid":            {"low": 48,  "mid": 63,  "high": 80},
            "senior":         {"low": 65,  "mid": 85,  "high": 108},
            "senior_manager": {"low": 85,  "mid": 110, "high": 140},
            "director":       {"low": 110, "mid": 142, "high": 180},
            "vp":             {"low": 142, "mid": 185, "high": 250},
        },
    },
    "Singapore": {
        "currency": "SGD",
        "Technical PM": {
            "junior":         {"low": 60,  "mid": 78,  "high": 98},
            "mid":            {"low": 80,  "mid": 105, "high": 132},
            "senior":         {"low": 108, "mid": 140, "high": 178},
            "senior_manager": {"low": 140, "mid": 180, "high": 228},
            "director":       {"low": 180, "mid": 230, "high": 292},
            "vp":             {"low": 230, "mid": 300, "high": 400},
        },
        "Data Scientist": {
            "junior":         {"low": 52,  "mid": 68,  "high": 86},
            "mid":            {"low": 70,  "mid": 92,  "high": 116},
            "senior":         {"low": 95,  "mid": 124, "high": 158},
            "senior_manager": {"low": 124, "mid": 160, "high": 204},
            "director":       {"low": 160, "mid": 206, "high": 262},
            "vp":             {"low": 206, "mid": 268, "high": 360},
        },
        "ML Engineer": {
            "junior":         {"low": 58,  "mid": 76,  "high": 96},
            "mid":            {"low": 78,  "mid": 102, "high": 128},
            "senior":         {"low": 105, "mid": 136, "high": 174},
            "senior_manager": {"low": 136, "mid": 176, "high": 224},
            "director":       {"low": 176, "mid": 226, "high": 288},
            "vp":             {"low": 226, "mid": 294, "high": 394},
        },
        "Full-Stack Engineer": {
            "junior":         {"low": 48,  "mid": 63,  "high": 80},
            "mid":            {"low": 65,  "mid": 85,  "high": 108},
            "senior":         {"low": 88,  "mid": 115, "high": 146},
            "senior_manager": {"low": 115, "mid": 149, "high": 190},
            "director":       {"low": 149, "mid": 193, "high": 245},
            "vp":             {"low": 193, "mid": 252, "high": 338},
        },
    },
}

# Fallback cohort mapping for cohorts not in MARKET_COMP_RANGES
COHORT_FALLBACK = {
    "Data-Oriented PM": "Technical PM",
    "Growth PM":        "Technical PM",
    "Product Lead":     "Technical PM",
    "Analytics Engineer": "Data Scientist",
    "Backend Engineer": "Full-Stack Engineer",
    "Frontend Engineer": "Full-Stack Engineer",
    "Engineering Manager": "Full-Stack Engineer",
}


def to_usd(amount: float, currency: str) -> float:
    """Convert any currency amount to USD."""
    rate = RATES_TO_USD.get(currency, 1.0)
    return round(amount * rate, 2)


def from_usd(amount_usd: float, target_currency: str) -> float:
    """Convert USD amount to target currency."""
    rate = RATES_TO_USD.get(target_currency, 1.0)
    return round(amount_usd / rate, 2)


def convert(amount: float, from_currency: str, to_currency: str) -> float:
    """Convert between any two currencies via USD."""
    if from_currency == to_currency:
        return amount
    usd = to_usd(amount, from_currency)
    return from_usd(usd, to_currency)


def format_comp(amount: float, currency: str) -> str:
    """Format compensation for display."""
    symbol = CURRENCY_SYMBOLS.get(currency, currency + " ")
    unit   = CURRENCY_UNIT.get(currency, "thousands")
    if unit == "lakhs":
        return f"{symbol}{amount}L"
    else:
        return f"{symbol}{int(amount)}K"


def get_market_comp(
    cohort: str,
    seniority: str,
    market: str = "India",
) -> dict | None:
    """
    Get market-specific comp range for a cohort + seniority + market.
    Returns values in the market's local currency.
    """
    market_data = MARKET_COMP_RANGES.get(market)
    if not market_data:
        market_data = MARKET_COMP_RANGES["India"]

    currency = market_data.get("currency", "INR")

    # Direct match
    cohort_data = market_data.get(cohort)
    if not cohort_data:
        # Try fallback
        fallback = COHORT_FALLBACK.get(cohort)
        cohort_data = market_data.get(fallback) if fallback else None

    if not cohort_data:
        return None

    # Map seniority
    seniority_map = {
        "intern": "junior", "junior": "junior", "mid": "mid",
        "senior": "senior", "lead": "senior", "staff": "senior",
        "principal": "senior_manager", "manager": "senior_manager",
        "senior_manager": "senior_manager", "associate_director": "director",
        "director": "director", "senior_director": "director",
        "vp": "vp", "svp": "vp", "evp": "vp", "c-suite": "vp",
    }
    comp_key  = seniority_map.get(seniority, "mid")
    next_keys = {"junior": "mid", "mid": "senior", "senior": "senior_manager",
                 "senior_manager": "director", "director": "vp", "vp": "vp"}
    next_key  = next_keys.get(comp_key, "vp")

    current    = cohort_data.get(comp_key,  {"low": 0, "mid": 0, "high": 0})
    next_level = cohort_data.get(next_key, {"low": 0, "mid": 0, "high": 0})

    return {
        "currency":        currency,
        "current_range":   {"low": current["low"],    "high": current["high"]},
        "current_mid":     current["mid"],
        "next_level_range": {"low": next_level["low"], "high": next_level["high"]},
        "market":          market,
        "unit":            CURRENCY_UNIT.get(currency, "thousands"),
    }


def compute_actual_comp_usd(
    base: float,
    currency: str,
    equity_usd: float = 0,
    variable_pct: float = 0,
) -> dict:
    """
    Compute total comp from components, normalised to USD.
    Base and variable are in the user's currency.
    Equity is always in USD (stock markets price in USD).
    """
    base_usd     = to_usd(base, currency)
    variable_usd = to_usd(base * (variable_pct / 100), currency)
    equity_usd   = equity_usd  # Already in USD

    total_usd = base_usd + variable_usd + equity_usd

    return {
        "base_usd":     round(base_usd, 0),
        "variable_usd": round(variable_usd, 0),
        "equity_usd":   round(equity_usd, 0),
        "total_usd":    round(total_usd, 0),
        "base_local":   base,
        "currency":     currency,
        "symbol":       CURRENCY_SYMBOLS.get(currency, "$"),
    }