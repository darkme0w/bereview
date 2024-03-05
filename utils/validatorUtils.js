const Validator = require('fastest-validator');
const validator = new Validator({
	useNewCustomCheckerFunction: true, // using new version
    messages: {
        // Register our new error message text
        isNotVNPhoneNumber: "Phone number is not valid",
		isNotId: "Id is not valid"
    }
});

module.exports = function (schema, data) {
	const validate = validator.compile(schema)(data)
	if(Array.isArray(validate)) {
		return validate
	}
	return null
}