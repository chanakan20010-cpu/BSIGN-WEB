import launchContent from "./launch-content.json" with { type: "json" };
export const bi = (th, en) => ({ th, en });
const img = (page, alt, crop) => ({
  url: `/reference/${page}.jpg`,
  alt: bi(
    alt,
    {
      ทีมงานร่วมมือกัน: "Team collaborating",
      ทีมวิศวกรร่วมวางแผนงาน: "Engineers planning together",
      "สำนักงาน BSIGN TECH": "BSIGN TECH office",
      "งานเปิดตัว BSIGN TECH": "BSIGN TECH launch event",
      ทีมงานร่วมประชุม: "Team meeting",
      ทีมงานระดมความคิด: "Team brainstorming",
      ประชุมทีม: "Team discussion",
      การพัฒนาซอฟต์แวร์: "Software development",
      วางแผนงาน: "Project planning",
    }[alt] || alt,
  ),
  crop,
});
const intro = bi(
  "แนะนำ BSIGN TECH พันธมิตรเทคโนโลยีรุ่นใหม่ที่มุ่งเน้นการพัฒนาระบบคลาวด์เนทีฟ (Cloud Native), สถาปัตยกรรมซอฟต์แวร์ระดับองค์กร และปัญญาประดิษฐ์อัตโนมัติ (AI Automation) ขับเคลื่อนขีดความสามารถทางธุรกิจของคุณอย่างไร้ขีดจำกัด",
  "Meet BSIGN TECH, your technology partner for cloud native systems, enterprise software architecture and AI automation. Unlock new possibilities for your business.",
);
const sub = bi(
  "โซลูชันเทคโนโลยีร่วมสมัยที่ผสานประสิทธิภาพ ความปลอดภัย และประสบการณ์ผู้ใช้ที่เหนือชั้น",
  "Modern technology solutions combining performance, security and exceptional user experiences.",
);
const title = (th, en, color = "#000000") => ({ text: bi(th, en), color });
const section = (eyebrow, heading) => ({ eyebrow, heading, description: sub });
const service = {
  eyebrow: bi("วิศวกรรมแพลตฟอร์ม", "Platform engineering"),
  title: bi("การพัฒนาซอฟต์แวร์และแพลตฟอร์ม", "Software & platform development"),
  body: bi(
    "สถาปัตยกรรมแบบ Microservices และ Web Application ประสิทธิภาพสูง ตอบสนองเร็วระดับมิลลิวินาที ออกแบบโครงสร้างรองรับผู้ใช้งานขนาดใหญ่โดยไม่มีสะดุด",
    "High performance microservices and web applications, engineered for fast responses and reliable operation at scale.",
  ),
};
const advantage = {
  title: bi("รวดเร็ว คล่องตัว และดูแลอย่างใกล้ชิด", "Agile, responsive and personal"),
  body: bi(
    "การดูแลอย่างใกล้ชิดจากทีมวิศวกรผู้เชี่ยวชาญโดยตรง เข้าถึงปัญหาได้ทันท่วงที และปรับเปลี่ยนกลยุทธ์ได้อย่างรวดเร็วตามความต้องการของธุรกิจ",
    "Work directly with our engineering team to solve problems promptly and adapt to your business needs.",
  ),
};
const sty = (
  size,
  weight,
  color = "#000000",
  mobile = size,
  tablet = size,
) => ({
  font: "Noto Sans Thai",
  size,
  tablet,
  mobile,
  color,
  weight,
  spacing: 0,
  line: 1.65,
});
const slot = (name) => ({
  name,
  color: "#805b00",
  background: "#fff3dc",
  asset: "",
  mode: "mask",
});
export const defaults = {
  global: {
    brand: bi("BSIGN TECH", "BSIGN TECH"),
    company: bi("บริษัท บีไซน์ เทค จำกัด", "BSIGN TECH Co., Ltd."),
    logo: img("home", "BSIGN TECH", [58, 24, 62, 65, 1296, 2857]),
    footerLogo: img("home", "BSIGN TECH", [58, 2647, 120, 125, 1296, 2857]),
    favicon: "",
    nav: [
      { label: bi("หน้าแรก", "Home"), href: "/" },
      { label: bi("ข่าวสารอัปเดต", "News"), href: "/news" },
      { label: bi("เกี่ยวกับเรา", "About us"), href: "/about" },
      { label: bi("ติดต่อเรา", "Contact us"), href: "/contact" },
    ],
    email: "visit@bsign.work",
    phone: "02-128-0942",
    address: bi(
      "40 อาคารลายูนิค ชั้นที่ 2 ห้องเลขที่ 2J ถนนเทศบาลรังสรรค์เหนือ แขวงลาดยาว เขตจตุจักร กรุงเทพมหานคร 10900",
      "40 La Unique Building, Floor 2, Room 2J, Thetsaban Rangsannuea Road, Lat Yao, Chatuchak, Bangkok 10900",
    ),
    contactHeading: bi("ช่องทางติดต่อ", "Contact"),
    addressHeading: bi("สำนักงานใหญ่", "Head office"),
    languages: { th: "TH", en: "EN" },
    menuLabel: bi("เปิดเมนู", "Open menu"),
    skip: bi("ข้ามไปยังเนื้อหา", "Skip to content"),
    readMore: bi("อ่านต่อ", "Read more"),
    search: bi("ค้นหา", "Search"),
    all: bi("ทั้งหมด", "All"),
    previous: bi("ก่อนหน้า", "Previous"),
    next: bi("ถัดไป", "Next"),
    empty: bi("ไม่พบข้อมูล", "No results found"),
    loading: bi("กำลังโหลด…", "Loading…"),
    error: bi(
      "เกิดข้อผิดพลาด กรุณาลองใหม่",
      "Something went wrong. Please try again.",
    ),
    notFound: bi("ไม่พบหน้าที่ต้องการ", "Page not found"),
    back: bi("กลับหน้าข่าวสาร", "Back to news"),
    privacyLabel: bi("นโยบายความเป็นส่วนตัว", "Privacy policy"),
    privacy: bi(
      "ข้อมูลที่คุณส่งผ่านแบบฟอร์มนี้ใช้เพื่อติดต่อกลับและพิจารณาคำขอเกี่ยวกับบริการของคุณเท่านั้น ติดต่ออีเมลของบริษัทเพื่อขอเข้าถึง แก้ไข หรือลบข้อมูล ไม่ส่งข้อมูลอ่อนไหวผ่านแบบฟอร์มนี้",
      "We use the information submitted through this form to respond to your service enquiry. Contact the company by email to request access, correction or deletion. Do not submit sensitive information through this form.",
    ),
  },
  home: {
    newsCategory: "technology",
    title: [
      title("สถาปัตยกรรมดิจิทัลล้ำสมัย", "Advanced digital architecture"),
      title("และวิศวกรรมอัจฉริยะ", "and intelligent engineering", "#805b00"),
    ],
    intro,
    hero: img("home", "ทีมงานร่วมมือกัน", [773, 187, 465, 528, 1296, 2857]),
    cta: bi("ความเคลื่อนไหวล่าสุด", "Latest updates"),
    ctaHref: "/news",
    services: section(
      bi("บริการหลักของเรา", "Our services"),
      bi(
        "สถาปัตยกรรมดิจิทัลเพื่อการเติบโตแบบก้าวกระโดด",
        "Digital architecture for exponential growth",
      ),
    ),
    cards: [service, service, service],
    why: section(
      bi("ทำไมต้องเลือกเรา", "Why choose us"),
      bi("พลังความคล่องตัวของบริษัทเทค", "The agility of a technology company"),
    ),
    advantages: [advantage, advantage, advantage],
    team: img("home", "ทีมวิศวกรร่วมวางแผนงาน", [58, 1363, 468, 350, 1296, 2857]),
    badge: bi("DNA นวัตกรรมองค์กร", "Innovation in our DNA"),
    badgeTitle: bi("คล่องตัว รวดเร็ว และมุ่งมั่น", "Agile, fast and committed"),
  },
  about: {
    title: [
      title("มุ่งมั่นสร้างสรรค์นวัตกรรม", "Committed to innovation"),
      title("เพื่ออนาคตดิจิทัลที่ยั่งยืน", "for a sustainable digital future", "#805b00"),
    ],
    intro,
    hero: img("about", "สำนักงาน BSIGN TECH", [776, 232, 438, 201, 1280, 2369]),
    matrix: bi("FOUNDATION MATRIX", "FOUNDATION MATRIX"),
    version: bi("[CORE.V1.0]", "[CORE.V1.0]"),
    method: bi("BSIGN METHODOLOGY", "BSIGN METHODOLOGY"),
    methodTitle: bi(
      "เชื่อมโยงโค้ดและเป้าหมายทางธุรกิจ",
      "Connecting code to business goals",
    ),
    stats: [
      {
        value: bi("100%", "100%"),
        label: bi("ความสมบูรณ์ของโค้ด", "Code integrity"),
      },
      {
        value: bi("รวดเร็ว", "Agile"),
        label: bi("รอบการพัฒนาต่อเนื่อง", "Continuous development"),
      },
    ],
    vision: section(
      bi("ทิศทางขององค์กร", "Our direction"),
      bi("วิสัยทัศน์ และ พันธกิจ", "Vision & mission"),
    ),
    missions: [
      {
        title: bi("วิสัยทัศน์", "Vision"),
        quote: bi(
          "มุ่งสู่การเป็นพันธมิตรด้านเทคโนโลยีที่ได้รับความไว้วางใจสูงสุด ในการส่งมอบนวัตกรรมดิจิทัลระดับแนวหน้า",
          "To be a trusted technology partner delivering leading digital innovation.",
        ),
        body: bi(
          "เพื่อขับเคลื่อนองค์กรให้ก้าวขึ้นสู่ความเป็นผู้นำด้วยความมั่นคง ปลอดภัย และก้าวล้ำ",
          "Empowering organizations to lead with stability, security and innovation.",
        ),
      },
      {
        title: bi("พันธกิจ", "Mission"),
        quote: bi(
          "มุ่งสู่การเป็นพันธมิตรด้านเทคโนโลยีที่ได้รับความไว้วางใจสูงสุด ในการส่งมอบนวัตกรรมดิจิทัลระดับแนวหน้า",
          "To be a trusted technology partner delivering leading digital innovation.",
        ),
        body: bi(
          "เพื่อขับเคลื่อนองค์กรให้ก้าวขึ้นสู่ความเป็นผู้นำด้วยความมั่นคง ปลอดภัย และก้าวล้ำ",
          "Empowering organizations to lead with stability, security and innovation.",
        ),
      },
    ],
    values: section(
      bi("หลักการทำงาน", "Our principles"),
      bi("คุณค่าหลักขององค์กร", "Our core values"),
    ),
    cards: [
      {
        title: bi("ความคล่องตัว ความรวดเร็ว", "Agility & speed"),
        highlight: bi("ปรับตัวไว ส่งมอบตรงเวลา", "Adapt quickly, deliver on time"),
        body: bi(
          "โครงสร้างบริษัทสมัยใหม่ ปรับตัวไว ไม่ติดกรอบขั้นตอนซ้ำซ้อน พร้อมส่งมอบผลงานตรงเวลาตามความต้องการ",
          "A modern organization that adapts quickly and delivers on time.",
        ),
        foot: bi("การพัฒนาที่รวดเร็ว", "Fast development"),
      },
      {
        title: bi("ความแม่นยำทางวิศวกรรม", "Engineering precision"),
        highlight: bi("มาตรฐานโค้ดสากล", "International code standards"),
        body: bi(
          "สถาปัตยกรรมที่ได้มาตรฐานสากลออกแบบให้รองรับการขยายตัวพร้อมระบบความปลอดภัย และการทดสอบที่เข้มงวด",
          "Scalable architecture with strong security and rigorous testing.",
        ),
        foot: bi("สถาปัตยกรรมที่คิดค้น", "Thoughtful architecture"),
      },
      {
        title: bi("ความโปร่งใสและจริงใจ", "Transparency & sincerity"),
        highlight: bi("สื่อสารตรงไปตรงมา", "Open communication"),
        body: bi(
          "สื่อสารชัดเจนในทุกขั้นตอน รายงานความคืบหน้าอย่างตรงไปตรงมา และร่วมคิดเสมือนเป็นพาร์ทเนอร์ในทีมของคุณ",
          "Clear communication and honest progress reporting, as part of your team.",
        ),
        foot: bi("เปิดรับความคิดเห็น", "Open to feedback"),
      },
      {
        title: bi("นวัตกรรมต่อเนื่อง", "Continuous innovation"),
        highlight: bi("เรียนรู้เทคโนโลยีใหม่เสมอ", "Always learning"),
        body: bi(
          "ไม่หยุดพัฒนาและเปิดรับเทคโนโลยีใหม่ๆ เช่น Cloud-native, AI integrations เพื่อให้ลูกค้าก้าวล้ำหน้าตลาดเสมอ",
          "Continually exploring cloud native technology and AI integrations.",
        ),
        foot: bi("เทคโนโลยีแห่งอนาคต", "Future technology"),
      },
    ],
  },
  news: {
    articleTitleColor: "#ffffff",
    title: [
      title("อัปเดตข่าวสาร", "News updates"),
      title("ความเคลื่อนไหว", "& insights", "#805b00"),
    ],
    section: section(
      bi("ข่าวสารและความเคลื่อนไหว", "News & insights"),
      bi("ความเคลื่อนไหวล่าสุด", "Latest updates"),
    ),
    related: bi("ความเคลื่อนไหวอื่นๆ", "More updates"),
    latest: bi("อัปเดตล่าสุด", "Latest update"),
    gallery: bi("ภาพบรรยากาศ", "Gallery"),
    categories: [
      { id: "announcement", label: bi("ประกาศบริษัท", "Announcements") },
      {
        id: "technology",
        label: bi("นวัตกรรมและเทคโนโลยี", "Innovation & technology"),
      },
      { id: "company", label: bi("ข่าวสารองค์กร", "Company news") },
    ],
    pageSize: 6,
  },
  cta: {
    eyebrow: bi("ร่วมสร้างสรรค์ไปด้วยกัน", "Let’s build together"),
    title: [
      title("สนใจร่วมงานหรือปรึกษา", "Let’s work together", "#ffffff"),
      title("โครงการร่วมกับเรา", "on your next project", "#ffbd35"),
    ],
    body: bi(
      "ไม่ว่าคุณจะเป็นสตาร์ตอัพที่กำลังสร้าง MVP หรือองค์กรที่ต้องการยกระดับโครงสร้างระบบดิจิทัล ทีมงาน BSIGN TECH พร้อมรับฟังและให้คำปรึกษา",
      "Whether you are building an MVP or transforming enterprise systems, BSIGN TECH is ready to listen and help.",
    ),
    primary: bi("ติดต่อเรา", "Contact us"),
    primaryHref: "/contact",
    secondary: bi("อ่านข่าวสาร", "Read news"),
    secondaryHref: "/news",
  },
  contact: {
    title: [title("ช่องทางติดต่อเรา", "Contact us")],
    subtitle: bi(
      "ไม่พลาดทุกการอัปเดตความเคลื่อนไหวของ บีไซน์ เทค",
      "Stay connected with BSIGN TECH",
    ),
    heading: bi("ช่องทางการติดต่อ", "Contact details"),
    formHeading: bi("ส่งข้อความถึงเรา", "Send us a message"),
    emailLabel: bi("อีเมลติดต่อ", "Email"),
    email: "visit@bsign.work",
    phoneLabel: bi("เบอร์โทรศัพท์", "Phone"),
    hoursLabel: bi("เวลาทำการ", "Business hours"),
    hours: bi(
      "จันทร์ - ศุกร์ : 09:00 - 18:00 น.",
      "Monday – Friday: 09:00 – 18:00",
    ),
    closed: bi(
      "ปิดทำการ เสาร์ - อาทิตย์ และวันหยุดนักขัตฤกษ์",
      "Closed on weekends and public holidays",
    ),
    socialHeading: bi("ช่องทางโซเชียลมีเดีย", "Social media"),
    socials: [
      {
        name: bi("ไลน์", "LINE"),
        handle: "@bsigntech",
        href: "https://line.me/R/ti/p/@bsigntech",
        icon: "line",
      },
      {
        name: bi("ลิงก์อิน", "LinkedIn"),
        handle: "BSIGN TECH",
        href: "",
        icon: "linkedin",
      },
      {
        name: bi("เฟซบุ๊ก", "Facebook"),
        handle: "bsigntech",
        href: "https://www.facebook.com/bsigntech",
        icon: "facebook",
      },
    ],
    fields: {
      name: {
        label: bi("ชื่อ-นามสกุล", "Full name"),
        placeholder: bi("เช่น คุณกฤษฎา วัฒนกุล", "Your full name"),
      },
      company: {
        label: bi("บริษัท หรือ องค์กร", "Company or organization"),
        placeholder: bi("เช่น บริษัท เทคโนโลยี จำกัด", "Company name"),
      },
      email: {
        label: bi("อีเมลสำหรับการติดต่อ", "Contact email"),
        placeholder: bi("name@company.com", "name@company.com"),
      },
      phone: {
        label: bi("เบอร์โทรศัพท์ติดต่อ", "Contact phone"),
        placeholder: bi("08X-XXX-XXXX", "Phone number"),
      },
      message: {
        label: bi("ข้อความ", "Message"),
        placeholder: bi("รายละเอียดที่ต้องการสอบถาม…", "How can we help?"),
      },
    },
    consent: bi(
      "ยินยอมให้ BSIGN TECH ติดต่อกลับและจัดเก็บข้อมูลเพื่อการเสนอโครงการตาม",
      "I agree that BSIGN TECH may store my details and contact me under the",
    ),
    submit: bi("ส่งข้อความติดต่อ", "Send message"),
    success: bi(
      "บันทึกข้อความของคุณแล้ว ขอบคุณที่ติดต่อเรา",
      "Your message has been saved. Thank you for contacting us.",
    ),
    pending: bi("กำลังส่ง…", "Sending…"),
    invalid: bi(
      "กรุณากรอกข้อมูลให้ครบถ้วนและยอมรับนโยบาย",
      "Please complete the fields and accept the policy.",
    ),
    mapPending: bi(
      "กำลังยืนยันพิกัดสำนักงาน โปรดติดต่อทีมงานเพื่อขอเส้นทาง",
      "Office coordinates are awaiting confirmation. Please contact our team for directions.",
    ),
    directions: bi("นำทางไปสำนักงาน", "Get directions"),
    map: {
      sourceUrl: "https://maps.app.goo.gl/MqMtHhTiYdafpjLC7",
      confirmed: false,
      latitude: 0,
      longitude: 0,
    },
  },
  styles: {
    brand: sty(23, 700, "#000000", 18, 19),
    hero: sty(48, 700, "#000000", 30, 36),
    heading: sty(36, 700, "#000000", 27, 32),
    subheading: sty(19, 700, "#000000", 18),
    body: sty(15, 400, "#666871"),
    inverse: sty(15, 400, "#a7a8ad"),
    intro: sty(18, 400, "#000000", 16),
    highlight: sty(14, 500, "#805b00"),
    menu: sty(16, 500, "#42454c"),
    button: sty(14, 700),
    label: sty(14, 600),
    footer: sty(14, 400, "#ffffff"),
  },
  icons: {
    shared: {
      marker: slot("Square"),
      previous: slot("ChevronLeft"),
      next: slot("ChevronRight"),
      arrow: slot("ArrowRight"),
      mail: slot("Mail"),
      phone: slot("Phone"),
      clock: slot("Clock"),
      pin: slot("MapPin"),
      building: slot("Building2"),
      terminal: slot("SquareTerminal"),
      rocket: slot("Rocket"),
      eye: slot("Eye"),
      speed: slot("Gauge"),
      engineering: slot("Wrench"),
      heart: slot("Handshake"),
      brain: slot("Brain"),
      bolt: slot("Zap"),
      menu: slot("Menu"),
      search: slot("Search"),
      line: slot("line"),
      linkedin: slot("linkedin"),
      facebook: slot("facebook"),
    },
    overrides: {},
  },
};
defaults.home.why.description = bi(
  "ในฐานะบริษัทเทคโนโลยีเปิดใหม่ เรามอบความยืดหยุ่น ความเร็วในการปรับตัว และความทุ่มเทให้กับทุกโครงการด้วยเทคโนโลยีที่ทันสมัยที่สุดในปัจจุบัน",
  "As a new technology company, we bring flexibility, responsiveness and dedication to every project with modern technology.",
);
const titles = [
  bi(
    "BSIGN TECH ประกาศเปิดตัวบริษัทอย่างเป็นทางการ พร้อมขับเคลื่อนบริการ Digital Transformation และ AI Solutions",
    "BSIGN TECH launches Digital Transformation and AI Solutions",
  ),
  bi(
    "แนวโน้ม Cloud Architecture และ Microservices ในปี 2025",
    "Cloud architecture and microservices trends in 2025",
  ),
  bi(
    "BSIGN TECH เปิดรับพันธมิตรทางธุรกิจร่วมพัฒนาโซลูชันอัจฉริยะ",
    "BSIGN TECH welcomes partners to build intelligent solutions",
  ),
  bi(
    "ความสำคัญของความปลอดภัยทางไซเบอร์ในระบบซอฟต์แวร์องค์กรยุค AI",
    "Cybersecurity for enterprise software in the age of AI",
  ),
];
export const articles = titles.map((title, i) => ({
  id: `seed-${i}`,
  slug: ["company-launch", "cloud-architecture", "partners", "cybersecurity"][
    i
  ],
  title,
  excerpt:
    i === 0
      ? bi(
          "แนะนำทีมงานวิศวกรซอฟต์แวร์และวิสัยทัศน์การให้บริการด้านเทคโนโลยีและซอฟต์แวร์ขั้นสูงสำหรับองค์กรยุคใหม่ ออกแบบสถาปัตยกรรมดิจิทัลเพื่อตอบโจทย์ตลาดที่มีความต้องการความคล่องตัวและความแม่นยำสูง",
          "Introducing our engineering team and vision for modern enterprise technology.",
        )
      : bi(
          "สำรวจการออกแบบระบบคลาวด์แบบกระจายตัวที่เน้นประสิทธิภาพการใช้ต้นทุน ความยืดหยุ่นในการสเกล และความง่ายในการดูแลรักษาสำหรับองค์กรและสตาร์ตอัป",
          "Explore cost effective, scalable and maintainable cloud architectures for enterprises and startups.",
        ),
  body: bi(
    "BSIGN TECH มุ่งเน้นการให้บริการด้าน Digital Transformation และ AI Solutions เพื่อตอบสนองต่อความต้องการขององค์กรและภาคธุรกิจที่กำลังเผชิญกับการเปลี่ยนแปลงอย่างรวดเร็วของเทคโนโลยีในปัจจุบัน\n\nบริษัทมุ่งมั่นที่จะพัฒนาโซลูชันและบริการที่สามารถรองรับความต้องการของธุรกิจในหลากหลายอุตสาหกรรม พร้อมให้ความสำคัญกับคุณภาพของระบบ ความปลอดภัยของข้อมูล และประสบการณ์การใช้งานที่เหมาะสมกับผู้ใช้",
    "BSIGN TECH focuses on Digital Transformation and AI Solutions for organizations adapting to rapid technological change.\n\nWe develop solutions with an emphasis on system quality, data security and user experience.",
  ),
  category: i === 0 ? "announcement" : "technology",
  status: "published",
  publishedAt: `2025-01-${[15, 12, 9, 3][i].toString().padStart(2, "0")}T00:00:00.000Z`,
  image:
    i === 0
      ? img("news", "งานเปิดตัว BSIGN TECH", [58, 455, 590, 507, 1296, 2889])
      : img(
          "home",
          title.en,
          [
            [58, 2049, 377, 209, 1296, 2857],
            [459, 2049, 378, 209, 1296, 2857],
            [861, 2049, 377, 209, 1296, 2857],
          ][i - 1],
        ),
  heroImage:
    i === 0
      ? img("article", "ทีมงานร่วมประชุม", [58, 187, 1180, 360, 1296, 2677])
      : null,
  gallery:
    i === 0
      ? [
          img("article", "ทีมงานระดมความคิด", [122, 962, 485, 252, 1296, 2677]),
          img("article", "ประชุมทีม", [122, 1373, 334, 200, 1296, 2677]),
          img("article", "การพัฒนาซอฟต์แวร์", [481, 1373, 334, 200, 1296, 2677]),
          img("article", "วางแผนงาน", [840, 1373, 334, 200, 1296, 2677]),
        ]
      : [],
}));
for (const [i, a] of articles.entries()) {
  if (i === 0) {
    Object.assign(a, launchContent);
    a.inlineImage = a.gallery.shift();
  } else {
    a.body = { ...a.excerpt };
  }
}
export function seed(db) {
  for (const [key, value] of Object.entries(defaults))
    db.prepare("INSERT OR IGNORE INTO documents(key,value) VALUES(?,?)").run(
      key,
      JSON.stringify(value),
    );
  if (!db.prepare("SELECT 1 FROM documents WHERE key='_seeded'").get()) {
    for (const a of articles) {
      const { id, ...value } = a;
      db.prepare("INSERT OR IGNORE INTO articles(id,value) VALUES(?,?)").run(
        id,
        JSON.stringify(value),
      );
    }
    db.prepare("INSERT INTO documents(key,value) VALUES(?,?)").run(
      "_seeded",
      "true",
    );
  }
}
