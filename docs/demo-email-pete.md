Subject: CLT EV Charging Dashboard — Demo Ready for Review

---

Pete,

The EV Charging Analytics dashboard prototype is ready for your review. We've connected it to your ChargePoint account and it's pulling live data — all 208 stations with real-time status updates.

**Demo Link:** https://app-clt-ev.pages.dev

**Login Credentials:**

| Username | Password | Role | What You See |
|----------|----------|------|-------------|
| demo | demo | Admin | Full access — all pages |
| ops | demo | Operations | Map, Stations, Utilization, Maintenance |
| finance | demo | Finance | Cost & Energy |
| leadership | demo | Leadership | Executive Summary, Forecast |

Start with the **Map** page — you'll see all 208 stations with live status from ChargePoint (green = available, blue = occupied, orange = unreachable). Click clusters to zoom in, click individual stations for details.

**Key pages to review:**
- **Stations** — sortable list with KPIs and status pie chart
- **Utilization** — session trends, top/bottom stations, usage heatmap
- **Cost & Energy** — kWh consumption, cost trends, Duke Energy rate comparison
- **Maintenance** — live view of faulted/unreachable stations needing attention
- **Executive Summary** — one-screen overview with report generation
- **Forecast** — capacity planning projections

**Public charger map** (no login needed): https://app-clt-ev.pages.dev/public

Data syncs automatically from ChargePoint every 30 minutes for station status and every 2 hours for session data.

Please use the feedback template below and send back your notes by [DATE]. Happy to jump on a call to walk through anything.

Best,
Brian

---

## Feedback Template

**Reviewer:** [Your Name]
**Date:** [Date]
**Role tested:** [demo / ops / finance / leadership]
**Device:** [Desktop / Tablet / Phone] — [Browser: Chrome / Safari / Edge]

### Overall Impression
_Rate 1-5 and add comments:_
- Look & Feel: [ ] / 5
- Navigation: [ ] / 5
- Data Accuracy: [ ] / 5
- Speed / Performance: [ ] / 5

### Page-by-Page Feedback

**Map View**
- Does it load correctly? [ Yes / No ]
- Can you find specific stations? [ Yes / No ]
- Comments:

**Station List**
- Is the data accurate to what you see in ChargePoint? [ Yes / No ]
- Are filters useful? [ Yes / No ]
- Comments:

**Utilization**
- Do the charts make sense? [ Yes / No ]
- What additional metrics would you want?

**Cost & Energy**
- Is the cost data directionally correct? [ Yes / No ]
- How important is Duke Energy rate integration? [ Critical / Nice-to-have / Not needed ]
- Comments:

**Maintenance**
- Are the flagged stations accurate? [ Yes / No ]
- Would your team use the ticket system? [ Yes / No ]
- Comments:

**Executive Summary**
- Would leadership find this useful? [ Yes / No ]
- Is the report mockup what you'd want? [ Yes / No ]
- Comments:

**Forecast / Planning**
- Are the projections helpful? [ Yes / No ]
- What planning data would you add?

### Missing Features
_What's not here that you'd need before going live?_
1.
2.
3.

### Priority Ranking
_Rank these planned features 1-7 (1 = most important):_
- [ ] Email/SMS alerts when stations go down
- [ ] PDF monthly reports
- [ ] Duke Energy rate integration
- [ ] Single sign-on with city Microsoft 365 accounts
- [ ] Fleet vehicle tracking
- [ ] Public charger availability for residents
- [ ] Historical data export for budget reports

### Additional Comments
_Anything else:_
