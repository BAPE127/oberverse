from PIL import Image, ImageDraw, ImageFont
import random
OUT='/home/user/oberverse/docs/mockups/'
def font(sz,bold=False):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        try: return ImageFont.truetype(p,sz)
        except Exception: pass
    return ImageFont.load_default()
F12,F14,F16,F22,F30=font(12),font(14),font(16,True),font(22,True),font(30,True)
def label(d,xy,t,f=F14,fill=(235,235,245),anchor='mm',shadow=True):
    if shadow: d.text((xy[0]+1,xy[1]+1),t,font=f,fill=(0,0,0),anchor=anchor)
    d.text(xy,t,font=f,fill=fill,anchor=anchor)
def legend(d,x,y,items,w=330):
    d.rectangle([x,y,x+w,y+26*len(items)+14],fill=(10,10,18),outline=(90,90,120))
    for i,(c,t) in enumerate(items):
        d.rectangle([x+10,y+12+26*i,x+34,y+30+26*i],fill=c,outline=(0,0,0)); label(d,(x+44,y+21+26*i),t,F12,anchor='lm')
def title(d,W,t,sub):
    label(d,(20,22),t,F22,anchor='lm'); label(d,(20,50),sub,F12,(170,170,190),anchor='lm')

# ---------------------------------------------------------------- Neumina (Windfen League)
def neumina():
    W,H=1600,1000
    im=Image.new('RGB',(W,H),(14,10,28)); d=ImageDraw.Draw(im)
    title(d,W,'NEUMINA — city map (mock)','Windfen League. Playable template: 6 districts joined by streets, alleys, elevated walkways (cyan), rooftops (dashed) and the service tunnels below (orange dashed).')
    # districts (x0,y0,x1,y1,colour,name)
    D={
     'corp':(760,90,1250,430,(40,38,92),'CORPORATE DISTRICT  "the Spire Rows"'),
     'lab':(1290,90,1580,430,(70,34,60),'RESTRICTED  Halcyon Works (lab)'),
     'ent':(520,470,1000,740,(80,28,92),'ENTERTAINMENT  "Glass Mile"'),
     'res':(30,90,470,520,(34,48,86),'RESIDENTIAL  "Stackhaven"'),
     'seam':(30,560,470,960,(60,40,40),'CRIMINAL  "the Seam"'),
     'ind':(1040,470,1580,960,(36,52,56),'INDUSTRIAL  "Kiln Basin"'),
     'tran':(520,780,1000,960,(30,60,70),'TRANSIT  Meridian Loop Station'),
    }
    for k,(a,b,c,e,col,name) in D.items():
        d.rectangle([a,b,c,e],fill=col,outline=(120,100,200),width=2); label(d,(a+(c-a)//2,b+16),name,F14,(210,200,255))
    # building blocks
    rnd=random.Random(5)
    for k,(a,b,c,e,col,name) in D.items():
        for bx in range(a+14,c-50,64):
            for by in range(b+38,e-50,58):
                if rnd.random()<0.12: continue
                w=rnd.randint(40,56); h=rnd.randint(34,48)
                shade=tuple(min(255,int(v*1.6)+10) for v in col)
                d.rectangle([bx,by,bx+w,by+h],fill=shade,outline=(0,0,0))
                if rnd.random()<0.45:
                    neon=rnd.choice([(255,60,200),(60,220,255),(255,210,70),(120,255,150)]); d.rectangle([bx+4,by+4,bx+w-4,by+9],fill=neon)
    # main avenues
    av=(70,70,110)
    for x0,y0,x1,y1 in [(0,440,1600,462),(500,60,520,1000),(1010,60,1030,1000),(1260,60,1280,440),(30,530,470,552)]:
        d.rectangle([x0,y0,x1,y1],fill=av)
    # elevated walkways
    for p in [[(760,300),(520,300),(470,300)],[(1250,250),(1290,250)],[(780,430),(780,470),(1000,470)],[(1000,600),(1040,600)]]:
        d.line(p,fill=(80,230,255),width=6)
    # rooftop routes (dashed)
    def dashed(p,col,w=4):
        for (x0,y0),(x1,y1) in zip(p,p[1:]):
            n=int(max(abs(x1-x0),abs(y1-y0))/14)
            for i in range(0,n,2):
                a=(x0+(x1-x0)*i/n,y0+(y1-y0)*i/n); b=(x0+(x1-x0)*(i+1)/n,y0+(y1-y0)*(i+1)/n); d.line([a,b],fill=col,width=w)
    dashed([(120,200),(300,230),(440,180)],(255,255,255)); dashed([(840,160),(1100,210),(1240,150)],(255,255,255)); dashed([(570,520),(760,560),(960,520)],(255,255,255))
    # service tunnels
    dashed([(250,740),(500,900),(760,900),(1040,740),(1300,820)],(255,150,40),6)
    dashed([(1000,860),(1350,700)],(255,150,40),6)
    # landmarks
    marks=[((1000,260),'Orrin-Voss Tower (HQ)',(255,230,80)),((1430,250),'Halcyon vault',(255,90,90)),((760,600),'Neon Lotus club',(255,60,200)),((150,320),'Safehouse 9',(120,255,150)),((250,760),'Glitch market',(255,150,40)),((800,870),'Transit hub',(80,230,255)),((1300,680),'Relay mast',(255,255,255)),((470,300),'Agency dead-drop',(120,255,150))]
    for (x,y),t,c in marks:
        d.ellipse([x-9,y-9,x+9,y+9],fill=c,outline=(0,0,0),width=2); label(d,(x,y-20),t,F12)
    label(d,(70,120),'ENTRY: Agency dropship pad',F12,(120,255,150),anchor='lm'); d.polygon([(40,120),(60,110),(60,130)],fill=(120,255,150))
    legend(d,1230,500,[((80,230,255),'elevated walkway'),((255,255,255),'rooftop route (dashed)'),((255,150,40),'service tunnel (dashed)'),((255,60,200),'neon shop front'),((120,255,150),'agency / entry'),((255,230,80),'mission landmark')],w=340)
    d.rectangle([30,968,520,996],fill=(10,10,18)); label(d,(40,982),'Simple mock: layout and routes only. Final art follows the supplied pixel-art reference.',F12,(170,170,190),anchor='lm')
    im.save(OUT+'proposal-postwar-neumina-map.png')

# ---------------------------------------------------------------- Noir city (Westreach)
def noir():
    W,H=1600,1000
    im=Image.new('RGB',(W,H),(20,24,30)); d=ImageDraw.Draw(im)
    title(d,W,'SAINT HALLORAN — city map (mock)','Westreach. Three mobs: Vantelli Family (casinos, finance), Kestrel Dock Union (smuggling, docks), Black Lantern Society (protection, politics). Rain, brick, neon.')
    sea=(24,40,60)
    d.rectangle([0,760,W,H],fill=sea)  # harbour
    for y in range(780,H,26): d.line([(0,y),(W,y)],fill=(30,52,76),width=1)
    TERR={'van':(190,50,60),'kes':(60,130,170),'lan':(210,160,50),'neu':(110,110,120)}
    zones=[('van',(560,90,1020,420),'VANTELLI — "the Velvet Strip"'),('lan',(60,90,520,420),'BLACK LANTERN — "Old Town"'),('kes',(300,520,1100,740),'KESTREL — "Pier Row & the Docks"'),('neu',(1060,90,1560,430),'DOWNTOWN (neutral): City Hall, Courts, Station 6'),('neu',(1130,470,1560,740),'RESIDENTIAL "Maple Heights"'),('neu',(60,470,260,740),'TENEMENTS "Hush Lane"')]
    rnd=random.Random(9)
    for key,(a,b,c,e),name in zones:
        col=TERR[key]; base=tuple(int(v*0.35) for v in col)
        d.rectangle([a,b,c,e],fill=base,outline=col,width=3); label(d,(a+(c-a)//2,b+14),name,F14,tuple(min(255,v+60) for v in col))
        for bx in range(a+12,c-46,60):
            for by in range(b+34,e-42,52):
                if rnd.random()<0.14: continue
                w=rnd.randint(36,50); h=rnd.randint(30,42)
                d.rectangle([bx,by,bx+w,by+h],fill=tuple(int(v*0.7) for v in col) if key!='neu' else (62,64,72),outline=(0,0,0))
                if rnd.random()<0.3: d.rectangle([bx+3,by+3,bx+9,by+9],fill=(255,220,120))
    st=(48,52,60)
    for x0,y0,x1,y1 in [(0,430,1600,458),(0,750,1600,772),(530,60,552,760),(1030,60,1052,760),(270,470,290,760),(1100,470,1120,760)]: d.rectangle([x0,y0,x1,y1],fill=st)
    for x in range(40,1560,90): d.line([(x,444),(x+40,444)],fill=(120,110,60),width=2)
    # docks / piers
    for x in range(360,1100,120): d.rectangle([x,772,x+22,880],fill=(88,66,44),outline=(0,0,0))
    # landmarks
    marks=[((800,250),'Gilded Ace casino (Vantelli HQ)',(255,210,80)),((690,330),'Club Verona (private meeting)',(255,120,140)),((240,240),'Lantern Hall (Black Lantern HQ)',(255,200,70)),((700,640),'Warehouse 14 (ledger)',(120,190,230)),((460,630),'Union Hall (Kestrel HQ)',(100,170,220)),((1300,200),'Station 6 + evidence room',(230,230,255)),((1200,260),'City Hall',(230,230,255)),((200,610),'Informant: Hush Lane',(120,255,150)),((880,860),'Agency boat landing (entry)',(120,255,150))]
    for (x,y),t,c in marks:
        d.ellipse([x-9,y-9,x+9,y+9],fill=c,outline=(0,0,0),width=2); label(d,(x,y-20),t,F12)
    # conflict arrows
    for a,b,col in [((680,300),(430,280),(255,120,120)),((700,420),(640,560),(255,120,120)),((460,420),(560,590),(255,120,120))]:
        d.line([a,b],fill=col,width=4); d.polygon([b,(b[0]-10,b[1]-14),(b[0]+10,b[1]-14)],fill=col)
    # clue boxes
    d.rectangle([1060,490,1100,640],fill=(10,12,16),outline=(90,90,110)); 
    legend(d,1130,775,[((190,50,60),'Vantelli territory'),((60,130,170),'Kestrel territory'),((210,160,50),'Black Lantern territory'),((110,110,120),'neutral / police'),((255,120,120),'where a staged attack could spark a war'),((120,255,150),'agency / entry / asset')],w=360)
    d.rectangle([30,968,640,996],fill=(10,12,16)); label(d,(40,982),'Simple mock: territories, landmarks and conflict routes. Rain, vintage signage and lighting come in the art pass.',F12,(170,170,190),anchor='lm')
    im.save(OUT+'proposal-postwar-noir-map.png')

# ---------------------------------------------------------------- Atlas zoom levels + mission lifecycle
def atlas():
    W,H=1600,820
    im=Image.new('RGB',(W,H),(16,26,40)); d=ImageDraw.Draw(im)
    title(d,W,'ATLAS — four zoom levels, and where a mission instance sits (mock)','Same data model at every level: country > city > playable map. International cities load as a template plus a throw-away mission instance.')
    panels=[(30,'1  GLOBAL','countries, seas, ports, bases'),(430,'2  COUNTRY','cities, roads, borders'),(830,'3  CITY','districts, destinations'),(1230,'4  PLAYABLE MAP','the existing game')]
    for x,t,s in panels:
        d.rectangle([x,100,x+340,440],fill=(26,44,66),outline=(100,140,190),width=2); label(d,(x+170,120),t,F16); label(d,(x+170,142),s,F12,(170,190,210))
    # level 1: continents
    d.rectangle([30,160,370,440],fill=(40,70,100))
    for pts,c in [([(60,300),(120,230),(210,250),(230,330),(150,400),(80,380)],(110,150,100)),([(250,200),(340,230),(350,330),(290,380),(240,300)],(150,140,100)),([(150,180),(210,175),(220,215),(160,220)],(120,120,150))]:
        d.polygon(pts,fill=c,outline=(0,0,0))
    label(d,(110,310),'SUND',F12); label(d,(300,290),'WINDFEN',F12); label(d,(185,200),'WESTREACH',F12)
    for x,y,c in [(115,300,(255,230,80)),(290,300,(255,60,200)),(185,210,(255,160,60))]: d.ellipse([x-6,y-6,x+6,y+6],fill=c,outline=(0,0,0))
    # level 2: country with cities
    d.rectangle([430,160,770,440],fill=(40,70,100)); d.polygon([(470,200),(740,190),(750,400),(520,420),(450,330)],fill=(110,140,110),outline=(0,0,0))
    for x,y,t,c in [(560,280,'Neumina',(255,60,200)),(660,230,'Capital',(240,240,240)),(520,360,'Port',(120,190,230)),(690,360,'Town',(200,200,200))]:
        d.ellipse([x-7,y-7,x+7,y+7],fill=c,outline=(0,0,0)); label(d,(x,y-16),t,F12)
    d.line([(560,280),(660,230),(690,360),(520,360),(560,280)],fill=(230,200,120),width=2)
    # level 3: city districts
    d.rectangle([830,160,1170,440],fill=(24,18,44))
    for i,(a,b,c,e,col) in enumerate([(850,180,990,290,(70,50,130)),(1000,180,1150,290,(90,40,100)),(850,300,990,420,(50,70,110)),(1000,300,1150,420,(60,90,90))]):
        d.rectangle([a,b,c,e],fill=col,outline=(150,130,220)); 
    for (x,y,t) in [(920,235,'Corporate'),(1075,235,'Lab'),(920,360,'Residential'),(1075,360,'Industrial')]: label(d,(x,y),t,F12)
    d.rectangle([1190-1190+1090,380,1130,410],fill=(255,210,80),outline=(0,0,0)); label(d,(1110,395),'ENTER',F12,(0,0,0),shadow=False)
    # level 4: tiles
    d.rectangle([1230,160,1570,440],fill=(60,52,40))
    for x in range(1240,1560,34):
        for y in range(170,430,34): d.rectangle([x,y,x+30,y+30],fill=(90,78,58) if (x//34+y//34)%2 else (80,70,52))
    d.ellipse([1390,290,1412,312],fill=(255,230,80),outline=(0,0,0))
    for x in (370,770,1170): d.polygon([(x+6,300),(x+26,310),(x+6,320)],fill=(255,255,255))
    # lifecycle row
    label(d,(30,480),'MISSION LIFECYCLE (international cities only)',F16,anchor='lm')
    steps=[('Load city\ntemplate','read-only'),('Make mission\ninstance','copy + mission config'),('Play','all changes land in the instance'),('Extract\nresults','whitelist only'),('Drop instance','template untouched'),('Return to\nSund','rewards paid once')]
    for i,(t,s) in enumerate(steps):
        x=30+i*262; d.rectangle([x,510,x+236,610],fill=(30,58,88) if i not in (2,) else (88,58,30),outline=(130,160,200),width=2)
        label(d,(x+118,545),t,F14); label(d,(x+118,590),s,F12,(170,190,210))
        if i<5: d.polygon([(x+240,552),(x+256,560),(x+240,568)],fill=(200,200,220))
    d.rectangle([30,640,780,790],fill=(18,34,22),outline=(80,160,100),width=2); label(d,(40,655),'KEPT after a mission (explicit whitelist)',F14,(140,255,170),anchor='lm')
    for i,t in enumerate(['mission complete + payment (once)','agency reputation','intelligence files','unlocked contracts','permanent equipment','designed campaign consequences']): label(d,(50+(i%2)*360,690+(i//2)*30),'+  '+t,F12,(220,240,225),anchor='lm')
    d.rectangle([820,640,1570,790],fill=(40,20,20),outline=(190,90,90),width=2); label(d,(830,655),'THROWN AWAY with the instance',F14,(255,150,150),anchor='lm')
    for i,t in enumerate(['NPC deaths and injuries','stolen clothing, disguises','hacked devices, alarms','destroyed objects','temporary gang or mob hostility','local police and gang events']): label(d,(840+(i%2)*360,690+(i//2)*30),'x  '+t,F12,(245,215,215),anchor='lm')
    im.save(OUT+'proposal-postwar-atlas-and-instances.png')
neumina(); noir(); atlas(); print('ok')
