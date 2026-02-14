const axios = require('axios');

const sampleGateway = {
  name: 'Test Gateway',
  protocol: 'tcp',
  connection: {
    host: '192.168.1.100',
    port: 502,
    unitId: 1,
    timeout: 5000,
    retryDelay: 3000,
  },
  polling: {
    enabled: true,
    interval: 5000,
    onError: 'continue',
  },
  registers: [
    {
      name: 'temperature',
      address: 30001,
      type: 'input',
      dataType: 'int16',
      scale: 0.1,
      unit: '°C',
    },
  ],
  deviceMapping: {
    autoRegister: true,
    deviceIdPrefix: 'MODBUS_',
    defaultTags: ['modbus', 'test'],
  },
};

axios.post('http://localhost:3001/modbus-gateways', sampleGateway)
  .then(response => {
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    console.log('Has registers:', !!response.data.data.registers);
    console.log('Has polling:', !!response.data.data.polling);
    console.log('Has deviceMapping:', !!response.data.data.deviceMapping);
  })
  .catch(error => {
    console.error('Error:', error.response ? error.response.data : error.message);
  });
