// Imports
import { RequestMethod } from '@nestjs/common';

export const staticConfig = {
  refreshMiddlewareEndpoints: [
    {
      path: 'admin/banking/aaBanks',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/dashboard/getRepaidCardData',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/notification/rejectedTrackerCount',
      method: RequestMethod.GET,
    },

    {
      path: 'admin/dashboard/getPaymentData',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/transaction/getTransactions',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/dashboard/get15DaysCountAndAmountEmiData',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/emi/repaymentStatus',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/transaction/getlastautodebitresponse',
      method: RequestMethod.GET,
    },
    {
      path: 'v3/misc/getsettingsdata',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/user/getinstalledapps',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/cibilscore/getcibiltriggerdata',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/dashboard/getDashboardData',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/dashboard/getDashboardGraphData',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/defaulter/loanAssetsData',
      method: RequestMethod.GET,
    },
    // v3 APIs
    {
      path: 'v3/referral/topReferralData',
      method: RequestMethod.GET,
    },
    {
      path: 'v3/misc/userLoanDeclineReasons',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/report/getRecoveryRate',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/dashboard/getTodayAutoDebitCount',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/defaulter/onlineUsers',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/defaulter/dayWiseDetails',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/defaulter/collectionSummary',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/emi/statusInsights',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/defaulter/dashboardCard',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/dashboard/getRegisteredUserData',
      method: RequestMethod.GET,
    },
    {
      path: '/admin/collectionDashboard/totalCollection',
      method: RequestMethod.GET,
    },
    {
      path: '/admin/collectionDashboard/collectionChartData',
      method: RequestMethod.GET,
    },
    {
      path: '/admin/collectionDashboard/collectionGoalData',
      method: RequestMethod.GET,
    },
    {
      path: '/admin/collectionDashboard/ptpData',
      method: RequestMethod.GET,
    },
    {
      path: '/admin/collectionDashboard/crmActivity',
      method: RequestMethod.GET,
    },
    {
      path: '/admin/collectionDashboard/recentCrmActivity',
      method: RequestMethod.GET,
    },
    {
      path: '/admin/collectionDashboard/bucketWiseCollection',
      method: RequestMethod.GET,
    },
    {
      path: '/admin/collectionDashboard/crmStatistics',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/defaulter/getDefaulterAssign',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/verification/creditAnalystAdmins',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/defaulter/getDefaulterAssign',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/verification/cseAdmins',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/admin/getAdminData',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/legal/advocateList',
      method: RequestMethod.GET,
    },
    {
      path: 'admin/employment/getCompanyActivityDetails',
      method: RequestMethod.GET,
    },
  ],
};
