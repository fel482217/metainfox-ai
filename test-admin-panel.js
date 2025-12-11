// Automated test script for Admin Panel
// This script logs in as admin and navigates through admin panel

import puppeteer from 'puppeteer';

(async () => {
  console.log('🚀 Starting Admin Panel Test...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Step 1: Navigate to login page
    console.log('📄 Step 1: Navigate to login page');
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: '/home/user/webapp/screenshots/01-login-page.png', fullPage: true });
    console.log('✅ Screenshot saved: 01-login-page.png\n');
    
    // Step 2: Fill login form and submit
    console.log('🔐 Step 2: Login as admin@metainfox.io');
    await page.type('#loginEmail', 'admin@metainfox.io');
    await page.type('#loginPassword', 'Demo123!@#');
    
    // Check human verification checkbox
    await page.click('#loginHumanCheck');
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: '/home/user/webapp/screenshots/02-login-filled.png', fullPage: true });
    console.log('✅ Screenshot saved: 02-login-filled.png\n');
    
    // Click login button
    console.log('🔄 Step 3: Submitting login...');
    await page.click('#loginButton');
    
    // Wait for redirect to dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    console.log('✅ Redirected to dashboard\n');
    
    // Step 4: Dashboard page
    console.log('📊 Step 4: Dashboard page');
    await page.waitForTimeout(2000); // Wait for data to load
    await page.screenshot({ path: '/home/user/webapp/screenshots/03-dashboard.png', fullPage: true });
    console.log('✅ Screenshot saved: 03-dashboard.png\n');
    
    // Step 5: Navigate to Admin Panel
    console.log('⚙️  Step 5: Navigate to Admin Panel');
    await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000); // Wait for admin panel to load
    await page.screenshot({ path: '/home/user/webapp/screenshots/04-admin-panel.png', fullPage: true });
    console.log('✅ Screenshot saved: 04-admin-panel.png\n');
    
    // Step 6: Test User Management section (if exists)
    console.log('👥 Step 6: Check for User Management section');
    const userMgmtExists = await page.evaluate(() => {
      return document.body.innerText.includes('Gestión de Usuarios') || 
             document.body.innerText.includes('Usuarios');
    });
    
    if (userMgmtExists) {
      console.log('✅ User Management section found\n');
    } else {
      console.log('⚠️  User Management section not visible yet\n');
    }
    
    // Step 7: Check Organization Management
    console.log('🏢 Step 7: Check for Organization Management section');
    const orgMgmtExists = await page.evaluate(() => {
      return document.body.innerText.includes('Organización') || 
             document.body.innerText.includes('Configuración');
    });
    
    if (orgMgmtExists) {
      console.log('✅ Organization Management section found\n');
    } else {
      console.log('⚠️  Organization Management section not visible yet\n');
    }
    
    // Step 8: Get page content info
    console.log('📝 Step 8: Page analysis');
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        hasAdminJS: !!document.querySelector('script[src="/static/admin.js"]'),
        hasAxios: !!window.axios,
        hasInitFunction: typeof window.initAdminPanel === 'function',
        bodyText: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('Page Title:', pageInfo.title);
    console.log('Has admin.js:', pageInfo.hasAdminJS);
    console.log('Has Axios:', pageInfo.hasAxios);
    console.log('Has initAdminPanel:', pageInfo.hasInitFunction);
    console.log('\nPage Content Preview:');
    console.log(pageInfo.bodyText);
    console.log('\n');
    
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!\n');
    console.log('📸 Screenshots saved to: /home/user/webapp/screenshots/\n');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    await page.screenshot({ path: '/home/user/webapp/screenshots/error.png', fullPage: true });
    console.log('📸 Error screenshot saved\n');
  } finally {
    await browser.close();
  }
})();
