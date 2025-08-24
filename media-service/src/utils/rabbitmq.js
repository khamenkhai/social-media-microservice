const amqp = require("amqplib");
const logger = require("./logger");

let connection = null;
let channel = null;

// 👇 define exchange name if not already defined
const EXCHANGE_NAME = process.env.RABBITMQ_EXCHANGE || "default_exchange";

async function connectToRabbitMQ() {
  try {
    console.log("🔄 Connecting to RabbitMQ...");

    connection = await amqp.connect(process.env.RABBITMQ_URL);
    console.log("✅ RabbitMQ connection established!");

    channel = await connection.createChannel();
    console.log("📡 Channel created successfully!");

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    console.log(`🔗 Exchange "${EXCHANGE_NAME}" declared (type: topic)`);

    return channel;
  } catch (error) {
    console.error("❌ Error connecting to RabbitMQ:", error.message);
    logger.log("Error connecting to rabbit mq");
  }
}

async function publishEvent(routingKey, message) {
  if (!channel) {
    await connectToRabbitMQ();
  }

  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message))
  );

  logger.info(`Event published: ${routingKey}`);
}

async function consumeEvent(routingKey, callback) {
  if (!channel) {
    await connectToRabbitMQ();
  }

  const q = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);
  channel.consume(q.queue, (msg) => {
    if (msg !== null) {
      const content = JSON.parse(msg.content.toString());
      callback(content);
      channel.ack(msg);
    }
  });

  logger.info(`Subscribed to event: ${routingKey}`);
}

module.exports = { connectToRabbitMQ, publishEvent, consumeEvent };
