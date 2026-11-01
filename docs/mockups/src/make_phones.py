# Proposal tooling: builds the OberPad mock-up pages from the game's own tablet styles (styles.css) plus tablet-base.css.
import sys
def status(): return '<div class="tb-status"><span><b>08:00</b> · Moonday · Day 7</span><span>76,866,000 ◎ · 📶 ▮▮▮ 🔋</span></div>'
def nav(title, back=True): return f'<div class="tb-nav">{"<button class=tb-back>‹</button>" if back else ""}<div class="tb-title">{title}</div></div>'
def hero(label, big, sub, color='#eeecff'): return f'<div class="tb-hero" style="margin-bottom:10px"><div class="grow"><div class="tb-label">{label}</div><div class="tb-big" style="color:{color}">{big}</div><div class="tb-sub">{sub}</div></div></div>'
def tiles(ts): return '<div class="tb-tiles" style="margin-bottom:10px">'+''.join(f'<div class="tb-tile"><div class="tb-n">{n}</div><div class="tb-t">{t}</div></div>' for n,t in ts)+'</div>'
def big(ic,t,s,btn=None,pri=True,border=None):
    b=f'<button class="btn {"pri" if pri else ""}">{btn}</button>' if btn else ''
    st=f' style="border-color:{border}"' if border else ''
    return f'<div class="big"{st}><div class="tb-ico">{ic}</div><div class="t"><b>{t}</b><small>{s}</small></div>{b}</div>'
def row(t,s,r='',sr=''): return f'<div class="row"><div><b>{t}</b><small>{s}</small></div><div class="rr"><b>{r}</b><small>{sr}</small></div></div>'
def label(t): return f'<div class="tb-label" style="margin:2px 4px 6px">{t}</div>'
def seg(items,on=0): return '<div class="seg3">'+''.join(f'<span class="{"on" if i==on else ""}">{x}</span>' for i,x in enumerate(items))+'</div>'
def note(t): return f'<div class="note">{t}</div>'
def bar(p,c=''): return f'<div class="bar"><i class="{c}" style="width:{p}%"></i></div>'
def fold(t): return f'<div class="tb-fold" style="border:2px solid #4a47b0;border-radius:14px;padding:11px 14px;font-weight:600;background:rgba(35,32,90,.6);margin-bottom:8px">▸ {t} ›</div>'
def chart(series, band=None, h=92, w=400, ymin=22, ymax=44):
    def pts(vs): return ' '.join(f'{i*(w-10)/(len(vs)-1)+5:.1f},{h-6-(v-ymin)/(ymax-ymin)*(h-12):.1f}' for i,v in enumerate(vs))
    s=f'<div class="chart"><svg viewBox="0 0 {w} {h}" preserveAspectRatio="none">'
    for y in (25,50,75): s+=f'<line x1="0" x2="{w}" y1="{h-6-(y-ymin)/(ymax-ymin)*(h-12):.1f}" y2="{h-6-(y-ymin)/(ymax-ymin)*(h-12):.1f}" stroke="#3a3790" stroke-width="1" stroke-dasharray="3 4"/>'
    if band:
        lo,hi,c=band; up=pts(hi); dn=' '.join(reversed(pts(lo).split(' ')))
        s+=f'<polygon points="{up} {dn}" fill="{c}" opacity=".22"/>'
    for vs,c,wd in series: s+=f'<polyline points="{pts(vs)}" fill="none" stroke="{c}" stroke-width="{wd}" stroke-linejoin="round" stroke-linecap="round"/>'
    return s+'</svg></div>'
def phone(cap, body, extra=''):
    return f'<div><div class="cap">{cap}</div><div id="modal-panel" class="tablet tablet2"><div id="modal-body">{status()}{body}</div></div>{extra}</div>'
def page(phones, title='mock'):
    return f'<!doctype html><meta charset="utf-8"><title>{title}</title><link rel="stylesheet" href="file:///home/user/oberverse/styles.css"><style>{open("tablet-base.css").read()}</style><body>{"".join(phones)}</body>'
SAMPLE='<div class="note" style="max-width:430px">Sample figures for the mock-up. The real screen reads them from the political simulation.</div>'

# ============================================================ POLITICS 1: overview, polls, government
p1 = phone('1 · Politics — the overview (one hero, one headline, Do next)',
  nav('🏛️ Politics', back=True)+
  hero('The President','Josiah Vegas','Order Party · day 214 of a 4-year term · approval 46%','#ffe28a')+
  tiles([('46%','approve'),('+3','since last poll'),('Day 301','next election')])+
  big('📰','Vegas raises police funding','Policy announced · starts in 9 days · costs 12,000 a day','Read',False)+
  label('Right now')+
  row('Order Party 38 · Liberty League 35','undecided 27 · poll of 1,200, ±3','Closer','than last month')+
  row('Top worry: crime','prices second · jobs third','▲','crime')+
  fold('Governments, history and results')+note('Politics never blocks play. Nothing here needs you; it just shows what the country is doing.'))
p2 = phone('2 · Polls — what people think, and why (not just a number)',
  nav('📊 Polls')+seg(['Approval','Parties','Issues'],1)+
  chart([([30,31,33,34,34,36,35,37,38],'#ff8a7a',3),([41,40,39,38,37,36,36,35,35],'#6ab0ff',3),([29,29,28,28,29,28,29,28,27],'#a09ec9',2)], band=([27,28,30,31,31,33,32,34,35],[33,34,36,37,37,39,38,40,41],'#ff8a7a'))+
  '<div class="leg"><span><b style="background:#ff8a7a"></b>Order 38</span><span><b style="background:#6ab0ff"></b>Liberty 35</span><span><b style="background:#a09ec9"></b>undecided 27</span></div>'+
  label('Why it moved this month')+
  row('Police funding announced','crime worry ▼','+2','Order')+row('Food prices up 6%','farm costs and the embargo','−2','Vegas approval')+row('Scandal: Susan\'s donor','alleged · not proved','−1','Liberty')+
  fold('Regions · older polls · how polls work')+note('Every poll is saved with its date, who ran it and its margin. The shaded band is that margin.'))
p3 = phone('3 · Government — what is being done, and what it costs',
  nav('📜 Government')+seg(['Policies','Budget','Cabinet'],0)+
  row('Police funding +20%','Active · 9 days to full effect','Active','12,000 / day')+
  row('Farm inspections','In implementation · needs 40 inspectors','62%','')+bar(62,'a')+
  row('Defence procurement','Under review · budget short by 40,000','Proposed','')+
  row('Trade restriction: Pallas','Approved · starts Moonday','Approved','')+
  label('Budget this month')+tiles([('+312k','revenue'),('−340k','spending'),('−28k','deficit')])+
  big('🧾','You can lobby the next step','Ask to change the timing or the design of a farm rule','Lobby')+fold('Decisions history'))
open('pol-oberpad-1.html','w').write(page([p1,p2,p3]))

# ============================================================ POLITICS 2: diplomacy, news, campaigns
d1 = phone('4 · Diplomacy — who we trade with and who we are fighting with',
  nav('🌐 Diplomacy')+
  row('<span class="flag" style="background:#7aa8e8"></span>Ostmark Union','Embassy open · trade agreement','Cool','−12')+
  row('<span class="flag" style="background:#e8a24a"></span>Varnistan','Dispute: Halden shipping · talks','Tense','−38')+
  row('<span class="flag" style="background:#e8d84a"></span>Teshvar','Oil contract renewal · friendly','Warm','+31')+
  row('<span class="flag" style="background:#d87ae8"></span>Pallas','Embargo (Sund imposes from Moonday)','Hostile','−71')+
  row('<span class="flag" style="background:#c8c8e8"></span>Lirre','Neutral · embassy open','Neutral','+4')+
  label('Active')+big('⚔️','Ostmark–Varn war','Day 43 · arms demand ↑ · shipping risk ↑','Open',False)+fold('Embassies · trade rules · wars and talks')+note('Wars and embargoes already exist in the game (v0.75). This screen reads the same state; the President can add more.'))
d2 = phone('5 · Political news — verified, alleged, forecast, opinion',
  nav('📰 News')+seg(['All','Government','World'],0)+
  row('<span class="tag v">verified</span>Vegas orders 40 more inspectors','Farm inspections start in 9 days','Day 214','')+
  row('<span class="tag al">alleged</span>Liberty donor met an Ostmark envoy','Reported by The Herald · denied','Day 213','')+
  row('<span class="tag fc">forecast</span>Fuel up 4% if the embargo holds','Treasury estimate','Day 212','')+
  row('<span class="tag rm">opinion</span>"Order is not freedom" — columnist','Not a report','Day 211','')+
  big('📌','Procurement programme open','Bid to supply 40 trucks to the Ministry of Defence · closes in 6 days','Bid')+fold('Older stories'))
d3 = phone('6 · Campaigns — election day, and your part in it (optional)',
  nav('🗳️ Campaigns')+
  hero('Next election','Day 301','87 days · Order 38 · Liberty 35 · tight','#ffe28a')+
  big('💸','Support a campaign','You have given 0 · rules and limits apply','Give')+
  big('🎪','Ways to help','Rally · office · meeting with business leaders · poll research','See')+
  big('🧾','Promises on file','Vegas: 2 · Susan: 3 · yours: none','Open',False)+
  note('You can ignore every election. The vote happens on the calendar with or without you.'))
open('pol-oberpad-2.html','w').write(page([d1,d2,d3]))

# ============================================================ POLITICS 3: access, bribe, your party
i1 = phone('7 · Access — who will see you, and what it will take',
  nav('🤝 Influence')+
  hero('Your standing','Known','Reputation 34 · legitimate donations 0 · conflicts of interest: none','#9af0c0')+
  row('President Vegas','Needs: a recommendation or a donation','Closed','')+
  row('Chief of Staff Marlow','Likes: arms contracts done on time','Open','')+
  row('Susan (opposition)','Likes: free-ports trade; asks for support','Open','')+
  row('Teshvar ambassador','Oil contract renewal; wants a shipping line','Open','')+
  big('📅','Ask for a meeting','Costs nothing. May be refused. A refusal is explained','Ask')+note('Money, reputation, relationships and support are separate things. Money alone does not open a door.'))
i2 = phone('8 · An offer — shown plainly before any money moves',
  nav('Offer to the President')+
  big('🛡️','Ask: move a defence contract your way','Request: a 2 × Skylark order for your Aerospace company','')+
  '<div class="tb-terms" style="border:2px solid #f2c14e;border-radius:14px;padding:12px 14px;margin-bottom:10px;background:rgba(242,193,78,.1)"><b>You pay 120,000</b> from your own cash<br><small style="color:#a09ec9">Odds: <b style="color:#f2c14e">low</b> (he is under pressure) · if it is found out: <b style="color:#ff8a7a">investigation, a scandal, a fine</b><br>It is recorded whether it works or not. Repeating it costs more each time.</small></div>'+
  '<div class="row2"><button class="btn pri" style="flex:1">Offer it</button><button class="btn" style="flex:1">Not now</button></div>'+
  note('Possible results: accepted · refused · counter-offer · delayed · half done · reported. Not a guaranteed purchase.'))
i3 = phone('9 · Your own party (late, optional) — a foundation, not a destination',
  nav('🏴 Your party')+
  hero('Founding needs','3 of 5 met','Office in a tower ✓ · Registration fee ✓ · Reputation ✓ · Platform ✗ · 3 staff ✗','#f2c14e')+
  big('🏢','Party headquarters','An office in the corporate centre. Same office system as your company HQ','Furnish')+
  big('🧑‍💼','Hire staff','Campaign manager · pollster · fundraiser · legal adviser · organiser','Hire')+
  big('📜','Platform','Choose priorities. Each choice pleases some voters and costs you others','Edit')+
  fold('Registration, support and candidacy'))
open('pol-oberpad-3.html','w').write(page([i1,i2,i3]))

# ============================================================ WAR: company, transfers, production
w1 = phone('1 · Military app — the company at a glance (same layout as a business)',
  nav('🪖 Ironclad Company')+
  hero('Readiness','82%','146 people · 12 squads · 4 tanks · 2 helicopters · 3 aircraft','#9af0c0')+
  tiles([('2','contracts'),('3','low supplies'),('41 days','of food')])+
  label('Do next')+
  big('📦','Move 2 aircraft in from Aerospace','Free transfer · 2 Skylarks are ready on the apron','Move')+
  big('🏭','Tank line has 1 tank waiting','Gun parts short: order 120 plates','Order')+
  big('🧾','A security contract is open','Guard a warehouse · 3 days · 4,800','View',False)+
  fold('Squads, base, generals and war room ›'))
w2 = phone('2 · Transfers — one place to move real stock, always free between your companies',
  nav('🔄 Transfers')+seg(['From Aerospace','From Arms','Ships'],0)+
  row('Skylark (aircraft)','Finished · parked at Starling · not assigned','2 free','')+
  row('Skylance missile','In the Aerospace store · 14 on hand','14 free','')+
  row('Sentinel strategic missile','1 delivered · reserved for a tender','0 free','')+
  big('➡️','Move 2 Skylarks to the company','They leave Aerospace; the count there drops by 2. No fee, no sale entry','Move')+
  note('Items must exist and be free. Reserved, deployed or destroyed items cannot be moved. A return is allowed if the item is not assigned.'))
w3 = phone('3 · Production — tanks and helicopters only (planes, missiles, guns and ships are never built here)',
  nav('🏭 Production')+seg(['Tanks','Helicopters','Queue'],0)+
  row('Anvil MK1 tank','4 days · plates 12 · engine 1 · optics 1','560,000','each')+
  big('➕','Order 3 tanks','Needs 36 plates · 3 engines · 3 optics. Two of 3 in stock','Order')+
  label('Lines')+
  row('Line 1 · working','Tank 2 of 3 · 2 days left','Shift: 2','')+bar(66)+
  row('Line 2 · blocked','Waiting for 2 engines','Paused','')+bar(10,'r')+
  fold('Upgrade the works · hire engineers · maintenance'))
open('war-oberpad-1.html','w').write(page([w1,w2,w3]))

w4 = phone('4 · Generals — people who make decisions, with real strengths',
  nav('🎖️ Generals')+
  row('Gen. Mira Odalys','Defence · careful · air coordination','1,900 / day','')+
  row('Gen. Pell Rostrov','Offence · bold · armour','2,300 / day','')+
  big('📝','Give Pell the Halden crossing','Assessment: likely win, losses 12–25, 3 tanks at risk. Not a promise','Assess')+
  note('You can lead the same battle yourself. Once one way is chosen, the other is closed.'))
w5 = phone('5 · Contracts — from a warehouse watch up to a war',
  nav('📑 Contracts')+seg(['Open','Active','Done'],0)+
  row('Guard the Quay warehouse','3 days · 4 guards · client: Lanternside Fish Co-op','4,800','low risk')+
  row('Escort a fuel convoy','Hald Reach · 2 days · client: Treasury','11,000','medium')+
  row('Hold Halden Roads','Ostmark Union · 21 days · needs 2 tanks, 40 troops','95,000','high')+
  big('⚠️','Your forces do not meet this one','2 tanks needed, you have 1 ready. Nothing is spawned for you','',False,'#ff8a7a')+fold('Reputation · clients · lost jobs'))
w6 = phone('6 · After-action report — what really happened to people and kit',
  nav('📋 After action: Halden Roads')+
  hero('Result','Held','2 of 3 objectives · paid 88,000 of 95,000','#9af0c0')+
  tiles([('9','killed'),('14','wounded'),('1','tank lost')])+
  row('Missile: 2 used','Longbow · 2 of 14 left','','')+row('Supplies','Ammo −34% · fuel −22% · food −9%','','')+row('Front line','Falkenmark: held · enemy depot destroyed','','')+
  row('Costs','Wages 41,000 · repairs 22,000 · replacements pending','','')+fold('Who fell · who was hurt · what is damaged'))
open('war-oberpad-2.html','w').write(page([w4,w5,w6]))
