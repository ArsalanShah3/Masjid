export type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'url' | 'date' | 'checkbox' | 'media-upload' | 'time';

export type FieldConfig = {
  name: string;
  label: string;
  type: FieldType;
  options?: Array<{ label: string; value: string }>;
  accept?: string;
};

export type ResourceConfig = {
  key: string;
  title: string;
  apiPath: string;
  fields: FieldConfig[];
  searchKeys: string[];
};

const apiBase = '/api';

export const adminResources: ResourceConfig[] = [
  {
    key: 'prayer-times',
    title: 'Prayer Times',
    apiPath: `${apiBase}/admin/prayer-times`,
    searchKeys: ['dateKey', 'notes'],
    fields: [
      { name: 'dateKey', label: 'Date Key', type: 'date' },
      { name: 'fajr', label: 'Fajr', type: 'time' },
      { name: 'zohar', label: 'Zohar', type: 'time' },
      { name: 'asr', label: 'Asr', type: 'time' },
      { name: 'isha', label: 'Isha', type: 'time' },
      { name: 'juma', label: 'Juma', type: 'time' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  {
    key: 'income-records',
    title: 'Income Records',
    apiPath: `${apiBase}/admin/income-records`,
    searchKeys: ['title', 'source', 'date', 'note'],
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'source', label: 'Source', type: 'text' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'month', label: 'Month', type: 'number' },
      { name: 'year', label: 'Year', type: 'number' },
      { name: 'note', label: 'Note', type: 'textarea' }
    ]
  },
  {
    key: 'expense-records',
    title: 'Expense Records',
    apiPath: `${apiBase}/admin/expense-records`,
    searchKeys: ['title', 'category', 'note'],
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'category', label: 'Category', type: 'text' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'month', label: 'Month', type: 'number' },
      { name: 'year', label: 'Year', type: 'number' },
      { name: 'note', label: 'Note', type: 'textarea' }
    ]
  },
  {
    key: 'madrasa-records',
    title: 'Madrasa Records',
    apiPath: `${apiBase}/admin/madrasa-records`,
    searchKeys: ['title', 'studentCount', 'teacherCount', 'note'],
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'studentCount', label: 'Student Count', type: 'number' },
      { name: 'teacherCount', label: 'Teacher Count', type: 'number' },
      { name: 'month', label: 'Month', type: 'number' },
      { name: 'year', label: 'Year', type: 'number' },
      { name: 'note', label: 'Note', type: 'textarea' }
    ]
  },
  {
    key: 'mosque-bedding',
    title: 'Mosque History',
    apiPath: `${apiBase}/admin/mosque-bedding`,
    searchKeys: ['itemName', 'category', 'note'],
    fields: [
      { name: 'itemName', label: 'Item Name', type: 'text' },
      { name: 'category', label: 'Category', type: 'select', options: [
        { label: 'Bedding', value: 'Bedding' },
        { label: 'Foundation', value: 'Foundation' },
        { label: 'Expansion', value: 'Expansion' },
        { label: 'Repairs', value: 'Repairs' },
        { label: 'Other', value: 'Other' }
      ] },
      { name: 'quantity', label: 'Quantity', type: 'number' },
      { name: 'note', label: 'Note', type: 'textarea' }
    ]
  },
  {
    key: 'staff-records',
    title: 'Imam / Muazzin & Staff',
    apiPath: `${apiBase}/admin/staff-records`,
    searchKeys: ['staffName', 'role', 'note'],
    fields: [
      { name: 'staffName', label: 'Staff Name', type: 'text' },
      {
        name: 'role',
        label: 'Role',
        type: 'select',
        options: [
          { label: 'Imam', value: 'Imam' },
          { label: 'Muazzin', value: 'Muazzin' },
          { label: 'Khadim', value: 'Khadim' }
        ]
      },
      { name: 'dateKey', label: 'Date', type: 'date' },
      { name: 'fajrAttendance', label: 'Fajr Attendance', type: 'select', options: [{ label: 'Present', value: 'Present' }, { label: 'Absent', value: 'Absent' }] },
      { name: 'zoharAttendance', label: 'Zohar Attendance', type: 'select', options: [{ label: 'Present', value: 'Present' }, { label: 'Absent', value: 'Absent' }] },
      { name: 'asrAttendance', label: 'Asr Attendance', type: 'select', options: [{ label: 'Present', value: 'Present' }, { label: 'Absent', value: 'Absent' }] },
      { name: 'maghribAttendance', label: 'Maghrib Attendance', type: 'select', options: [{ label: 'Present', value: 'Present' }, { label: 'Absent', value: 'Absent' }] },
      { name: 'ishaAttendance', label: 'Isha Attendance', type: 'select', options: [{ label: 'Present', value: 'Present' }, { label: 'Absent', value: 'Absent' }] },
      { name: 'note', label: 'Note', type: 'textarea' }
    ]
  },
  {
    key: 'shop-records',
    title: 'Shop Records',
    apiPath: `${apiBase}/admin/shop-records`,
    searchKeys: ['shopName', 'ownerName', 'contactNumber', 'serialNumber', 'date', 'month', 'year', 'note'],
    fields: [
      { name: 'shopName', label: 'Shop Name', type: 'text' },
      { name: 'ownerName', label: 'Rental Name', type: 'text' },
      { name: 'buyDate', label: 'Date', type: 'date' },
      { name: 'note', label: 'Note', type: 'textarea' },
      { name: 'monthlyRent', label: 'Monthly Rent (Rs)', type: 'number' }
    ]
  },
  {
    key: 'donations',
    title: 'Donations',
    apiPath: `${apiBase}/admin/donations`,
    searchKeys: ['donorName', 'date', 'note'],
    fields: [
      { name: 'donorName', label: 'Donor Name', type: 'text' },
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        options: [
          { label: 'Friday', value: 'Friday' },
          { label: 'Box', value: 'Box' },
          { label: 'Ramadan', value: 'Ramadan' },
          { label: 'Fitrah', value: 'Fitrah' },
          { label: 'General', value: 'General' },
          { label: 'Project', value: 'Project' }
        ]
      },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'month', label: 'Month', type: 'number' },
      { name: 'year', label: 'Year', type: 'number' },
      { name: 'note', label: 'Note', type: 'textarea' }
    ]
  },
  {
    key: 'ramadan-donations',
    title: 'Ramadan Donations',
    apiPath: `${apiBase}/admin/ramadan-donations`,
    searchKeys: ['donorName', 'date', 'note'],
    fields: [
      { name: 'donorName', label: 'Donor Name', type: 'text' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'month', label: 'Month', type: 'number' },
      { name: 'year', label: 'Year', type: 'number' },
      { name: 'note', label: 'Note', type: 'textarea' }
    ]
  },
  {
    key: 'ramadan-expenses',
    title: 'Ramadan Expenses',
    apiPath: `${apiBase}/admin/ramadan-expenses`,
    searchKeys: ['title', 'date', 'note'],
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'month', label: 'Month', type: 'number' },
      { name: 'year', label: 'Year', type: 'number' },
      { name: 'note', label: 'Note', type: 'textarea' }
    ]
  },
  {
    key: 'fitrah-records',
    title: 'Ramadan Records',
    apiPath: `${apiBase}/admin/fitrah-records`,
    searchKeys: ['familyName', 'note'],
    fields: [
      { name: 'familyName', label: 'Family Name', type: 'text' },
      { name: 'membersCount', label: 'Members Count', type: 'number' },
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'year', label: 'Year', type: 'number' },
      { name: 'note', label: 'Note', type: 'textarea' }
    ]
  },
  {
    key: 'projects',
    title: 'Projects',
    apiPath: `${apiBase}/admin/projects`,
    searchKeys: ['title', 'description'],
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'status', label: 'Status', type: 'select', options: [
        { label: 'Complete', value: 'Complete' },
        { label: 'Incomplete', value: 'Incomplete' },
        { label: 'Upcoming', value: 'Upcoming' }
      ] },
      { name: 'targetAmount', label: 'Target Amount', type: 'number' },
      { name: 'collectedAmount', label: 'Collected Amount', type: 'number' },
      { name: 'imageUrl', label: 'Upload Image', type: 'media-upload', accept: 'image/*' }
    ]
  },
  {
    key: 'gallery',
    title: 'Gallery',
    apiPath: `${apiBase}/admin/gallery`,
    searchKeys: ['title', 'caption'],
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'mediaType', label: 'Media Type', type: 'select', options: [{ label: 'Image', value: 'image' }, { label: 'Video', value: 'video' }] },
      { name: 'url', label: 'Upload Media', type: 'media-upload', accept: 'image/*,video/*' },
      { name: 'caption', label: 'Caption', type: 'textarea' }
    ]
  },
  {
    key: 'hero-slides',
    title: 'Hero Slides',
    apiPath: `${apiBase}/admin/hero-slides`,
    searchKeys: ['title', 'subtitle'],
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { name: 'imageUrl', label: 'Image URL', type: 'url' },
      { name: 'linkUrl', label: 'Link URL', type: 'url' },
      { name: 'order', label: 'Order', type: 'number' },
      { name: 'active', label: 'Active', type: 'checkbox' }
    ]
  },
  {
    key: 'settings',
    title: 'Settings',
    apiPath: `${apiBase}/admin/settings`,
    searchKeys: ['masjidName', 'address'],
    fields: [
      { name: 'masjidName', label: 'Masjid Name', type: 'text' },
      { name: 'madrasaName', label: 'Madrasa Name', type: 'text' },
      { name: 'address', label: 'Address', type: 'textarea' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'notice', label: 'Notice', type: 'textarea' },
      { name: 'prayerMarquee', label: 'Prayer Marquee', type: 'textarea' },
      // Removed logoUrl, heroHeading, heroSubheading per admin UI simplification
    ]
  }
];

export function getResourceConfig(key: string) {
  return adminResources.find((resource) => resource.key === key);
}
