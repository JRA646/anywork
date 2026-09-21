import type { Provider, Quote, Service, ServiceRequest } from '../types/marketplace'

export const services: Service[] = [
  { id: 'print', title: 'Print', label: 'Printing & signage', description: 'Banners, signage, promotional materials and commercial printing.', icon: 'Printer', items: ['Banners & tarpaulins', 'Business signage', 'Window graphics', 'Promotional materials'], startingPrice: '$180' },
  { id: 'build', title: 'Build', label: 'Furniture & fabrication', description: 'Custom furniture, fixtures, cabinets and practical built solutions.', icon: 'Hammer', items: ['Custom furniture', 'Cabinets & counters', 'Shelving & storage'], startingPrice: '$450' },
  { id: 'install', title: 'Install', label: 'Installation & assembly', description: 'Professional installation and assembly for signs, furniture and displays.', icon: 'Boxes', items: ['Sign installation', 'Furniture assembly', 'Display installation'], startingPrice: '$220' },
  { id: 'maintain', title: 'Maintain', label: 'Repairs & maintenance', description: 'Handyman repairs, painting, fixture replacement and property upkeep.', icon: 'Wrench', items: ['Minor repairs', 'Painting & patching', 'Fixture replacement'], startingPrice: '$120' },
  { id: 'site', title: 'Site', label: 'Site services', description: 'Site preparation, fit-out assistance, material handling and coordination.', icon: 'HardHat', items: ['Site preparation', 'Fit-out assistance', 'Material handling'], startingPrice: '$250' },
  { id: 'custom', title: 'Custom', label: 'Special projects', description: 'Unusual work routed to providers with the right capabilities.', icon: 'BriefcaseBusiness', items: ['Custom jobs', 'Event setup', 'Special fabrication'], startingPrice: 'Quote' },
]

export const providers: Provider[] = [
  { id: 'signal', name: 'Signal Works', initials: 'SW', serviceIds: ['print', 'install'], rating: 4.8, reviewCount: 128, completedJobs: 231, location: 'Parramatta', responseTime: 'Under 30 min', responseRate: '98%', summary: 'Commercial signage, banners and on-site installation.', verified: true },
  { id: 'northside', name: 'Northside Fabrication', initials: 'NF', serviceIds: ['build', 'install'], rating: 4.9, reviewCount: 96, completedJobs: 184, location: 'North Sydney', responseTime: 'Under 1 hr', responseRate: '96%', summary: 'Custom furniture, shop fit-outs and installation.', verified: true },
  { id: 'fixright', name: 'FixRight Services', initials: 'FR', serviceIds: ['maintain', 'site'], rating: 4.7, reviewCount: 73, completedJobs: 97, location: 'Mascot', responseTime: 'Under 2 hrs', responseRate: '94%', summary: 'Maintenance, repairs and practical site support.', verified: true },
  { id: 'anytask', name: 'AnyTask Crew', initials: 'AC', serviceIds: ['custom', 'site', 'maintain'], rating: 4.6, reviewCount: 61, completedJobs: 121, location: 'Alexandria', responseTime: 'Under 1 hr', responseRate: '95%', summary: 'Flexible crews for custom jobs and site support.', verified: true },
]

export const requests: ServiceRequest[] = [
  { id: 'AW-1027', customer: 'John Doe', serviceId: 'print', title: 'Commercial banner installation', status: 'Quoted', location: 'Parramatta', date: '24 Sep 2026 · 10:00 AM', budget: 1500, description: 'Supply and install a commercial banner for a retail frontage.', quotes: ['Q-201', 'Q-202', 'Q-203'] },
  { id: 'AW-1026', customer: 'John Doe', serviceId: 'build', title: 'Office furniture assembly', providerId: 'northside', status: 'Scheduled', location: 'North Sydney', date: '27 Sep 2026 · 9:00 AM', budget: 900, description: 'Assembly and positioning of custom office cabinetry.', quotes: ['Q-204'] },
  { id: 'AW-1025', customer: 'ABC Business', serviceId: 'maintain', title: 'Office maintenance visit', status: 'Requested', location: 'Mascot', date: '29 Sep 2026', budget: 750, description: 'General maintenance across the office and reception area.', quotes: [] },
  { id: 'AW-1024', customer: 'Retail Co.', serviceId: 'install', title: 'Store signage installation', providerId: 'signal', status: 'In Progress', location: 'Parramatta', date: '22 Sep 2026 · 1:30 PM', budget: 2000, description: 'Install new external and internal store signage.', quotes: ['Q-205'] },
]

export const quotes: Quote[] = [
  { id: 'Q-201', requestId: 'AW-1027', providerId: 'signal', amount: 1850, availability: '24 Sep · 10:00 AM', message: 'Includes supply, installation and post-install inspection.', status: 'Pending' },
  { id: 'Q-202', requestId: 'AW-1027', providerId: 'northside', amount: 1720, availability: '25 Sep · 9:00 AM', message: 'Includes installation and site cleanup.', status: 'Pending' },
  { id: 'Q-203', requestId: 'AW-1027', providerId: 'anytask', amount: 1580, availability: '24 Sep · 2:00 PM', message: 'Includes labor and installation support.', status: 'Pending' },
  { id: 'Q-204', requestId: 'AW-1026', providerId: 'northside', amount: 920, availability: '27 Sep · 9:00 AM', message: 'Assembly, placement and final cleanup.', status: 'Accepted' },
  { id: 'Q-205', requestId: 'AW-1024', providerId: 'signal', amount: 2140, availability: '22 Sep · 1:30 PM', message: 'Installation and final alignment included.', status: 'Accepted' },
]