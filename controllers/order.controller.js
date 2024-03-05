const OrdersModel = require("../models/Orders.model");
const ProductsModel = require("../models/Products.model");
const isId = require("../utils/isId");
const isVietnamesePhoneNumber = require("../utils/isVietnamesePhoneNumber");
const { success, invalidData, serverInternal } = require("../utils/responseUtil");
const validatorUtils = require("../utils/validatorUtils")
const excel = require("exceljs");
const moment = require("moment/moment");
const { getIo } = require("../sockets/io")
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.BOT_TELEGRAM_TOKEN, { polling: false });
const chatId = process.env.CHAT_ID_TELEGRAM;
const io = getIo()

const convertingData = (data) => {
	let returnObject = {
		name: data.name,
		phone: data.phone,
		products: data.products,
		deliveryMethod: data.deliveryMethod,
		paymentMethod: data.paymentMethod,
		total: data.total,
		totalDiscount: data.totalDiscount,
		isRedBill: data.isRedBill,
		note: data.note,
	}
	if (data.deliveryMethod === 0) {
		returnObject.address = data.address
	} else {
		returnObject.comeToReceive = data.comeToReceive
	}
	return returnObject
}

const _comeToReceive = {
	now: { type: 'boolean' },
	restaurant: {
		type: "string",
		custom: (v, err) => {
			if (!isId(v)) err.push({ type: 'isNotId' })
			return v;
		}
	},
	time: { type: 'string', optional: true },
	date: { type: 'string', optional: true },
	$$strict: true
}

const _create = {
	name: { type: "string" },
	phone: {
		type: "string",
		custom: (v, err) => {
			if (!isVietnamesePhoneNumber(v)) err.push({ type: 'isNotVNPhoneNumber' })
			return v;
		}
	},
	products: {
		type: "array", min: 1, items: {
			type: "object",
			props: {
				_id: {
					type: "string",
					custom: (v, err) => {
						if (!isId(v)) err.push({ type: 'isNotId' })
						return v;
					}
				},
				quantity: { type: "number", min: 1 },
				note: { type: "string", optional: true }
			}
		}
	},
	address: { type: "string", optional: true },
	deliveryMethod: { type: "enum", values: [0, 1] },
	paymentMethod: { type: "enum", values: [0, 1, 2] },
	note: { type: "string", optional: true },
	comeToReceive: { type: "object", optional: true }
}

const create = async (req, res) => {
	let data = req.body;
	const validateErr = validatorUtils(_create, data)
	if (validateErr) return invalidData(res, validateErr)
	if (data.deliveryMethod === 0) {
		if (!data.address) {
			return invalidData(res, null);
		}
	} else {
		if (!data.comeToReceive || typeof data.comeToReceive !== 'object') {
			return invalidData(res, null);
		} else {
			const validateErr = validatorUtils(_comeToReceive, data.comeToReceive)
			if (validateErr) {
				return invalidData(res, validateErr)
			} else {
				if (data.comeToReceive.now === false) {
					if (!!data.comeToReceive.time && !!data.comeToReceive.date) {
						const validTime = moment(data.comeToReceive.time, 'HH:mm', true).isValid()
						const validDate = moment(data.comeToReceive.date, 'yyyy-MM-DD', true).isValid()
						if (!validDate && !validTime) {
							return invalidData(res, validateErr)
						}
					} else {
						return invalidData(res, validateErr)
					}
				}
			}
		}
	}
	const listProductsIDs = data.products.map((v) => (v._id))
	const products = await ProductsModel.find({ _id: { $in: listProductsIDs } }).select('_id price name discount').lean()
	if (products.length !== listProductsIDs.length) {
		return invalidData(res, {
			type: 'productsNotExists'
		}, 'Một số mặt hàng đã không tồn tại')
	}

	let total = 0;
	let totalDiscount = 0;
	let productText = []
	data.products = products.map((v) => {
		const clientProduct = data.products.find((f) => f._id === v._id.toString())
		total += v.price * clientProduct.quantity
		totalDiscount += v.discount * clientProduct.quantity
		productText.push(`\n${v.name.vi} - ${clientProduct.quantity}`)
		return (
			{
				product: v._id,
				price: v.price,
				discount: v.discount,
				quantity: clientProduct.quantity,
				note: clientProduct?.note,
			}
		)
	})
	data.total = (total - totalDiscount)
	data.totalDiscount = totalDiscount
	data = convertingData(data)
	try {
		const order = await OrdersModel.create(data)
		OrdersModel.populate(order, { path: "comeToReceive.restaurant", select: 'name' }).then((res) => {
			let typeOrder = 'Loại đơn:\n';
			if (order.deliveryMethod === 1) {
				let time = ''
				if (order.comeToReceive.now) {
					time = 'ngay bây giờ'
				} else {
					time = order.comeToReceive.time + ' - ' + formatDateWithFormatStr(order.comeToReceive.date, 'DD-MM-YYYY')
				}
				typeOrder += `Đến lấy tại ${res.comeToReceive.restaurant.name} - ${time}`
			} else {
				typeOrder += 'Ship đi'
			}
			const messageText = `${order.code}\n${typeOrder}\nTên: ${res.name}\nSĐT: ${res.phone}\nĐịa chỉ: ${res.address??''} ${productText}\nTổng giá giảm: ${formatNumber(data.totalDiscount)}\nTổng đơn hàng: ${formatNumber(data.total)}`
			bot.sendMessage(chatId, messageText);
		})

		io.to('admin').emit('newOrder', order)
		success(res, order)
	} catch (error) {
		serverInternal(res, null, error)
	}
}

const rgx = (pattern) => new RegExp(`.*${pattern}.*`);

const convertQuery = (query) => {
	query = query ?? {}
	if (!!query.name) {
		query.name = { $regex: rgx(query.name.trim()), $options: 'i' }
	}
	if (query.name === '') {
		delete query.name
	}
	if (!!query.code) {
		query.code = { $regex: rgx(query.code.trim()), $options: 'i' }
	}
	if (query.code === '') {
		delete query.code
	}
	if (!!query.phone && query.phone !== '') {
		query.phone = { $regex: rgx(query.phone.trim()), $options: 'i' }
	}
	if (query.phone === '') {
		delete query.phone
	}
	if (!!query.orderProcess) {
		if (query.orderProcess.length === 0) {
			delete query.orderProcess
		} else {
			query.orderProcess = { $in: query.orderProcess }
		}
	}
	if (!!query.paymentMethod) {
		if (query.paymentMethod.length === 0) {
			delete query.paymentMethod
		} else {
			query.paymentMethod = { $in: query.paymentMethod }
		}
	}
	if (!!query.deliveryMethod && query.deliveryMethod === 'null') {
		delete query.deliveryMethod
	}
	if (!!query.createdDates && Array.isArray(query.createdDates) && query.createdDates.length === 2) {
		const startDate = new Date(query.createdDates[0])
		startDate.setSeconds(0)
		startDate.setHours(0)
		startDate.setMinutes(0)
		const endDate = new Date(query.createdDates[1])
		endDate.setSeconds(0)
		endDate.setHours(0)
		endDate.setMinutes(0)
		query.createdAt = { $gte: startDate, $lte: endDate }
		delete query.createdDates
	}
	query.deleted = false
	return query
}

const listOrder = async (req, res) => {
	let { page, limit } = req.query
	const options = {
		page: page ?? 1,
		limit: limit ?? 30,
		lean: true,
		sort: {
			createdAt: -1
		}
	};
	let query = req.body
	query = convertQuery(query)
	const response = await OrdersModel.paginate(query, options);
	success(res, response)
}

const detailOrder = async (req, res, next) => {
	const { id } = req.query
	if (!isId(id)) return invalidData(res, { type: 'isNotId' })
	const order = await OrdersModel.findOne({ _id: id, deleted: false })
		.populate({ path: 'comeToReceive.restaurant', select: 'name address' })
		.populate({ path: 'products.product', select: 'name price discount' }).lean()
	if (!order) return invalidData(res, { type: 'orderNotFound' }, 'Đơn không tồn tại hoặc bị xóa')
	success(res, order)
}

const updateOrderProcess = async (req, res) => {
	const { id, orderProcess } = req.body
	if (!isId(id)) return invalidData(res, { type: 'isNotId' });
	const order = await OrdersModel.findOneAndUpdate({ _id: id, deleted: false }, { orderProcess }, { new: true })
	success(res, order)
}

const deletedOrder = async (req, res) => {
	const { id } = req.query
	if (!isId(id)) return invalidData(res, { type: 'isNotId' });
	try {
		await OrdersModel.findOneAndUpdate({ _id: id, deleted: false }, { deleted: true })
		success(res)
	} catch (error) {
		serverInternal(res, null, error)
	}

}

const deliveryMethodText = {
	0: 'Đơn ship đi',
	1: 'Đơn đến lấy'
}

function formatDateWithFormatStr(dateStr, format = '') {
	let dateFormatted = moment(dateStr).format(format);
	if (dateFormatted === 'Invalid date')
		return '';
	return dateFormatted;
}

const paymentMethodText = {
	0: 'Quẹt thẻ',
	1: 'Chuyển khoản',
	2: 'Tiền mặt'
}

function formatNumber(num) {
	num = !isNaN(parseInt(num)) ? String(num).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : 0
	return num
}

const downloadReport = async (req, res) => {
	let query = req.body
	query = convertQuery(query)
	console.log(query)
	let orders = await OrdersModel.find(query).lean()

	let workbook = new excel.Workbook();
	let worksheet = workbook.addWorksheet("Orders");

	orders = orders.map((v) => (
		{
			code: v.code,
			deliveryMethod: deliveryMethodText[v.deliveryMethod],
			date: formatDateWithFormatStr(v.createdAt, 'DD/MM/YYYY'),
			dateHouse: formatDateWithFormatStr(v.createdAt, "HH:mm:ss"),
			total: formatNumber(v.total),
			paymentMethod: paymentMethodText[v.paymentMethod]
		}
	))

	worksheet.columns = [
		{ header: "Mã đơn", key: "code", width: 15 },
		{ header: "Phân loại đơn", key: "deliveryMethod", width: 20 },
		{ header: "Ngày", key: "date", width: 20 },
		{ header: "Giờ đặt", key: "dateHouse", width: 25 },
		{ header: "Thành tiền", key: "total", width: 25 },
		{ header: "Hình thức thanh toán", key: "paymentMethod", width: 15 },
	];
	// Add Array Rows
	worksheet.addRows(orders);
	res.setHeader(
		"Content-Type",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	);
	res.setHeader(
		"Content-Disposition",
		"attachment; filename=" + "Bao-cao-hoa-don.xlsx"
	);
	return workbook.xlsx.write(res).then(function () {
		res.status(200).end();
	});
}

const getNotificationUnreadCount = async (req, res) => {
	const orders = await OrdersModel.find({ deleted: false, orderProcess: 0 }).select('code createdAt').sort({ createdAt: -1 }).lean()
	success(res, orders)
}

module.exports = {
	create,
	listOrder,
	detailOrder,
	downloadReport,
	updateOrderProcess,
	deletedOrder,
	getNotificationUnreadCount
}