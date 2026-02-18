import { Link } from 'react-router-dom';
import logoAsw from '@/assets/logo-asw.png';
import footerFbIcon from '@/assets/footer-fb-icon.png';
import footerLineIcon from '@/assets/footer-line-icon.png';
import footerIgIcon from '@/assets/footer-ig-icon.png';
import footerYtIcon from '@/assets/footer-yt-icon.png';
import footerTiktokIcon from '@/assets/footer-tiktok-icon.svg';
import { PhoneCall } from 'lucide-react';

const footerMenus = {
  "menu1": [
    {
      "id": 1,
      "name": "คอนโดมิเนียม",
      "link": "https://assetwise.co.th/th/condominium"
    },
    {
      "id": 2,
      "name": "บ้านและทาวน์โฮม",
      "link": "https://assetwise.co.th/th/house"
    },
    {
      "id": 3,
      "name": "โปรโมชั่น",
      "link": "https://assetwise.co.th/th/house"
    },
    {
      "id": 4,
      "name": "รู้จักแอสเซทไวส์",
      "link": "https://assetwise.co.th/th/about-us"
    },
    {
      "id": 5,
      "name": "นักลงทุนสัมพันธ์",
      "link": "https://investor.assetwise.co.th/th/home"
    },
    {
      "id": 6,
      "name": "แอสเซทไวส์คลับ",
      "link": "https://assetwise.co.th/th/club"
    },
    {
      "id": 7,
      "name": "ข่าวสาร",
      "link": "https://assetwise.co.th/th/news"
    },
    {
      "id": 8,
      "name": "บล็อก",
      "link": "https://assetwise.co.th/th/blog"
    }
  ],
  "menu2": [
    {
      "id": 1,
      "name": "Bank Matching",
      "link": "https://aswinno.assetwise.co.th/bankmatching"
    }
  ],
  "menu3": [
    {
      "id": 1,
      "name": "เสนอขายที่ดิน",
      "link": "https://aswland.assetwise.co.th/"
    },
    {
      "id": 2,
      "name": "เสนอขายสินค้าและบริการ",
      "link": "https://procurement.assetwise.co.th/"
    },
    {
      "id": 3,
      "name": "ฝากขาย-ฝากเช่า",
      "link": "https://www.assetaplus.com/"
    }
  ],
  "menu4": [
    {
      "id": 1,
      "name": "ติดต่อเรา",
      "link": "https://assetwise.co.th/th/contact"
    },
    {
      "id": 2,
      "name": "ร้องเรียนธรรมาภิบาล",
      "link": "https://assetwise.co.th/th/appeal-form"
    },
    {
      "id": 3,
      "name": "ติดต่อผู้คุ้มครองข้อมูลส่วนบุคคล",
      "link": "https://services.assetwise.co.th/DSRM/DSRForm"
    },
    {
      "id": 4,
      "name": "นโยบายข้อมูลส่วนบุคคล",
      "link": "https://assetwise.co.th/privacy-policy/"
    }
  ],
  "menu5": [
    {
      "id": 1,
      "name": "คอนโดใกล้มหาวิทยาลัย",
      "link": "https://assetwise.co.th/university/"
    },
    {
      "id": 2,
      "name": "คอนโดภาคตะวันออก",
      "link": "https://assetwise.co.th/eec/"
    },
    {
      "id": 2,
      "name": "รามคำแหง",
      "link": "https://assetwise.co.th/ramkhamhaeng/"
    },
    {
      "id": 2,
      "name": "สุขุมวิท",
      "link": "https://assetwise.co.th/sukhumvit/"
    },
    {
      "id": 2,
      "name": "บางนา",
      "link": "https://assetwise.co.th/bangna/"
    },
    {
      "id": 2,
      "name": "ม.เกษตรฯ",
      "link": "https://assetwise.co.th/kaset/"
    },
    {
      "id": 2,
      "name": "รังสิต",
      "link": "https://assetwise.co.th/rangsit/"
    },
    {
      "id": 2,
      "name": "รัชดา",
      "link": "https://assetwise.co.th/ratchada/"
    },
    {
      "id": 2,
      "name": "ลาดพร้าว",
      "link": "https://assetwise.co.th/ladprao/"
    },
  ]
}

function Footer() {
  return (
    <footer className="bg-footer-background pt-17">
      <div className="container px-4 lg:px-6 mx-auto">
        <div className="w-full flex flex-col md:flex-row">
          <div className="w-full md:w-4/12 flex flex-col gap-3 mb-5 md:mb-0">
            <img src={logoAsw} alt="AssetWise Logo" width={160} height={35} className="h-auto w-[220px] mb-5" />
            <h4 className="text-white text-[20px] font-normal">ติดตามแอสเซทไวส์</h4>
            <div className="social-listed flex gap-3 mb-3">
              <a href="https://th-th.facebook.com/AssetWiseThailand/" title="Facebook" className="opacity-80 hover:opacity-100 transition">
                <img src={footerFbIcon} alt="Facbook" width={45} height={45} className="" />
              </a>
              <a href="https://page.line.me/assetwise" title="Line" className="opacity-80 hover:opacity-100 transition">
                <img src={footerLineIcon} alt="Line" width={45} height={45} className="" />
              </a>
              <a href="https://www.instagram.com/assetwisethailand" title="Instagram" className="opacity-80 hover:opacity-100 transition">
                <img src={footerIgIcon} alt="Instagram" width={45} height={45} className="" />
              </a>
              <a href="https://www.youtube.com/c/AssetwiseChannel" title="Youtube" className="opacity-80 hover:opacity-100 transition">
                <img src={footerYtIcon} alt="Youtube" width={45} height={45} className="" />
              </a>
              <a href="https://www.tiktok.com/@assetwise" title="Tiktok" className="opacity-80 hover:opacity-100 transition">
                <img src={footerTiktokIcon} alt="Tiktok" width={45} height={45} className="" />
              </a>
            </div>
            <a href="tel:021680000" title='โทรศัพท์' className='text-3xl flex text-[#47ccc7]'>
              <PhoneCall className='w-7 h-7' /> <span className='ml-2'>02-168-0000</span>
            </a>
            
          </div>
          <div className="w-full md:w-8/12 grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-0 md:flex-row justify-between">
            <div className="menu">
              <h5 className="text-white text-xl mb-2">แอสเซทไวส์</h5>
              <ul className="flex flex-col gap-3">
                {footerMenus.menu1.map((menu, key) => (
                  <li key={key}>
                    <a href={menu.link} className="text-neutral-400 hover:text-white transition">{menu.name}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="menu">
              <h5 className="text-white text-xl mb-2">โครงการตามทำเล</h5>
              <ul className="flex flex-col gap-3">
                {footerMenus.menu5.map((menu, key) => (
                  <li key={key}>
                    <a href={menu.link} className="text-neutral-400 hover:text-white transition">{menu.name}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="menu">
              <h5 className="text-white text-xl mb-2">สนใจทำธุรกิจกับเรา</h5>
              <ul className="flex flex-col gap-3">
                {footerMenus.menu3.map((menu, key) => (
                  <li key={key}>
                    <a href={menu.link} className="text-neutral-400 hover:text-white transition">{menu.name}</a>
                  </li>
                ))}
              </ul>
              <div className="h-7"></div>
              <h5 className="text-white text-xl mb-2">บริการ</h5>
              <ul className="flex flex-col gap-3">
                {footerMenus.menu2.map((menu, key) => (
                  <li key={key}>
                    <a href={menu.link} className="text-neutral-400 hover:text-white transition">{menu.name}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="menu">
              <h5 className="text-white text-xl mb-2">ติดต่อ</h5>
              <ul className="flex flex-col gap-3">
                {footerMenus.menu4.map((menu, key) => (
                  <li key={key}>
                    <a href={menu.link} className="text-neutral-400 hover:text-white transition">{menu.name}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="h-7"></div>
        <p className="text-white border-t border-t-neutral-400 py-7">© สงวนลิขสิทธิ์ พ.ศ. 2569 บริษัท แอสเซทไวส์ จำกัด (มหาชน)</p>
      </div>
    </footer>
  );
}

export default Footer;