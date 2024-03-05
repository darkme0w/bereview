const ProductSchema = require("../models/Products.model");
const validatorUtils = require("../utils/validatorUtils");
const $ = require("../utils/$");
const isId = require("../utils/isId");
const { invalidData, success, serverInternal } = require("../utils/responseUtil");
const CategorySchema = require("../models/Categories.model");
const { default: mongoose } = require("mongoose");

const _create = {
	name: { type: "object" },
	description: { type: "object" },
	price: { type: "number" },
	category: { type: "string" },
	discount: { type: 'number' },
	discountPercent: { type: 'number' },
	tag: { type: 'number', default: 0 },
	_id: { type: 'string', optional: true },
}

const create = async (req, res) => {
	let data = req.body
	const validateErr = validatorUtils(_create, data)
	if (validateErr) return invalidData(res, validateErr)
	if (req.method === 'POST') {
		data.createdBy = req.user._id
		const [err, productSave] = await $(ProductSchema.create(data))
		if (err) return invalidData(res, err)
		await ProductSchema.populate(productSave, { path: 'category', select: 'name' })
		success(res, productSave)
	} else {
		if (!!data._id && isId(data._id)) {
			const id = data._id
			delete data._id
			const update = {
				'$set': data,
				'$push': { updatedBy: { user: req.user._id } }
			}
			const [err, productSave] = await $(ProductSchema.findOneAndUpdate({ _id: id }, update, { upsert: true, new: true })
				.populate({ path: 'createdBy', select: 'name' }).populate({ path: 'category', select: 'name' }))
			if (err) return invalidData(res, err)
			success(res, productSave)
		} else {
			invalidData(res)
		}
	}
}

const findAllAdmin = async (req, res) => {
	let { page, limit, name, cateId } = req.query
	const options = {
		page: page ?? 1,
		limit: limit ?? 30,
		lean: true,
		populate: [
			{
				path: 'createdBy',
				select: 'name'
			},
			{
				path: 'category',
				select: 'name'
			}
		]
	};
	let query = {
		deleted: false,
	}
	if (cateId) {
		query.category = cateId;
	}
	if (name) {
		query['name.vi'] = {
			'$regex': name, '$options': 'i'
		}
	}
	const response = await ProductSchema.paginate(query, options)
	success(res, response)
}


const findByCategory = async (req, res) => {
	const { cateId } = req.query
	if (isId(cateId) && !!cateId) {
		let query = { category: cateId, deleted: false, isVisitable: true }
		query.position = -1
		const select = 'name image tag _id'
		const [configs, positions] = await Promise.all([
			ProductSchema.find(query).select(select).lean(),
			ProductSchema.find(Object.assign(query, { position: { $gt: -1 } })).sort({ position: 1 }).select(select).lean()
		])
		return success(res, { positions, configs })
	}
	invalidData(res)
}

const updatePositions = async (req, res) => {
	let data = req.body
	if (!!data && !!data.positions && Array.isArray(data.positions) && !!data.nonePositions && Array.isArray(data.nonePositions)) {
		data.positions = data.positions.map((id, index) => ({
			updateOne: {
				filter: { _id: mongoose.Types.ObjectId(id) },
				update: { position: index }
			}
		}))
		data.nonePositions = data.nonePositions.map((id) => ({
			updateOne: {
				filter: { _id: mongoose.Types.ObjectId(id) },
				update: { position: -1 }
			}
		}))

		const updates = [...data.positions, ...data.nonePositions]
		try {
			const response = await ProductSchema.bulkWrite(updates)
			success(res, response)
		} catch (error) {
			console.log(error)
			serverInternal(res, error)
		}
	} else {
		invalidData(res)
	}
}

const updatePositionsBestSeller = async (req, res) => {
	let data = req.body
	if (!!data && !!data.positions && Array.isArray(data.positions) && !!data.nonePositions && Array.isArray(data.nonePositions)) {
		data.positions = data.positions.map((id, index) => ({
			updateOne: {
				filter: { _id: mongoose.Types.ObjectId(id) },
				update: { bestSellerPosition: index }
			}
		}))
		data.nonePositions = data.nonePositions.map((id) => ({
			updateOne: {
				filter: { _id: mongoose.Types.ObjectId(id) },
				update: { bestSellerPosition: -1 }
			}
		}))

		const updates = [...data.positions, ...data.nonePositions]
		try {
			const response = await ProductSchema.bulkWrite(updates)
			success(res, response)
		} catch (error) {
			console.log(error)
			serverInternal(res, error)
		}
	} else {
		invalidData(res)
	}
}

const findConfigBestSeller = async (req, res) => {
	let query = { deleted: false, isVisitable: true }
	query.bestSellerPosition = -1
	const select = 'name image tag _id'
	const [configs, positions] = await Promise.all([
		ProductSchema.find(query).select(select).lean(),
		ProductSchema.find(Object.assign(query, { bestSellerPosition: { $gt: -1 } })).sort({ bestSellerPosition: 1 }).select(select).lean()
	])
	success(res, { positions, configs })
}

const createTestData = async (req, res) => {
	const products = []
	const categories = await CategorySchema.find({}).lean()
	for (let i = 0; i < 100; i++) {
		products.push({
			name: {
				vi: `Sản phẩm ${i}`,
				kr: `제품 ${i}`
			},
			description: {
				vi: `Lorem Ipsum is simply dummy text of the printing and typesetting industry ${i}`,
				kr: `Lorem Ipsum은 단순히 인쇄 및 조판 업계의 더미 텍스트입니다. ${i}`
			},

			price: Math.floor(Math.random() * 500000) + 50000,
			category: categories[Math.floor(Math.random() * 10)]._id,
			discount: Math.floor(Math.random() * 40000),
			discountPercent: Math.floor(Math.random() * 100),
			createdBy: req.user._id,
			isVisitable: true,
			tag: Math.floor(Math.random() * 4),
			_id: mongoose.Types.ObjectId()
		})
	}
	await ProductSchema.insertMany(products)
	success(res)
}

const getBestSellers = async (req, res) => {
	const products = await ProductSchema.find({
		deleted: false, isVisitable: true, bestSellerPosition: { $gt: -1 }
	}).sort({ bestSellerPosition: 1 }).select('name image tag _id').lean();
	success(res, products)
}

const getProducts = async (req, res) => {
	const products = await ProductSchema.aggregate([
		{ $sort: { position: 1 } },
		{
			$match: {
				position: { $gt: -1 },
				deleted: false, isVisitable: true,
			}
		},
		{
			$lookup: {
				from: "categories",
				as: "categories",
				let: {
					category: "$category"
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: [
									{
										$toObjectId: "$$category"
									},
									{
										$toObjectId: "$_id"
									}
								]
							}
						}
					}
				]
			}
		},
		{
			$unwind: { path: "$categories", preserveNullAndEmptyArrays: true }
		},
		{
			$group: {
				"_id": "$categories.code",
				"products": {
					"$push": "$$ROOT"
				}
			}
		},
		{
			$project: {
				products: {
					"_id": 1,
					"image": 1,
					"discountPercent": 1,
					"tag": 1,
					"discount": 1,
					"name": 1,
					"price": 1,
					"description": 1
				}
			}
		},
		{
			$replaceRoot: {
				newRoot: {
					$arrayToObject: [
						[
							{
								k: "$_id",
								v: "$products"
							}
						]
					]
				}
			}
		}
	])
	const object = Object.assign({}, ...products);
	success(res, object)
}

const getProductIds = async (req, res) => {
	const data = req.body
	if (!!data && !!data.ids && Array.isArray(data.ids)) {
		const response = await ProductSchema.find({ _id: { $in: data.ids }, isVisitable: true, deleted: false })
			.select('_id name image price discount discountPercent description')
			.lean()
		return success(res, response)
	}
	invalidData(res)
}

const getSuggestProducts = async (req, res) => {
	const category = await CategorySchema.findOne({ code: 'MON_AN_KEM' }).select('_id').lean()
	const response = await ProductSchema.find({ category: category._id.toString(), isVisitable: true, deleted: false, position: { $gt: -1 } })
		.select('_id name image price')
		.lean()
	success(res, response)
}

const findProductByName = async (req, res) => {
	const { name } = req.query
	const query = {
		deleted: false,
		isVisitable: true,
		bestSellerPosition: -1,
		name: { $regex: '.*' + name ?? '' + '.*' }
	}
	const products = await ProductSchema.find(query).select('name image tag _id').lean()
	success(res, products)
}

const getBestSellerList = async (req, res) => {
	const query = { deleted: false, isVisitable: true, bestSellerPosition: { $gt: -1 } }
	const response = await ProductSchema.find(query).sort({ bestSellerPosition: 1 }).select('name image price tag _id').lean();
	success(res, response)
}

module.exports = {
	create,
	findAllAdmin,
	findByCategory,
	updatePositions,
	findConfigBestSeller,
	createTestData,
	getBestSellers,
	getProducts,
	getProductIds,
	getSuggestProducts,
	findProductByName,
	updatePositionsBestSeller,
	getBestSellerList
}