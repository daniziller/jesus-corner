// Plugin Capacitor custom pra assinatura via StoreKit 2 — não existe
// plugin oficial da Capacitor pra isso. Espelha o que
// src/billing/subscriptionStore.js espera (getProducts/purchase/
// restorePurchases/finishTransaction), com os IDs de produto vindos de
// src/billing/storeTiers.js.
//
// FLAG IMPORTANTE: este arquivo nunca foi compilado nem testado — não há
// Xcode instalado na máquina onde foi escrito. Antes de confiar nele:
// 1. Abrir ios/App/App.xcworkspace no Xcode.
// 2. Adicionar a capability "In-App Purchase" (Signing & Capabilities).
// 3. Resolver qualquer erro de build (a API do StoreKit 2/Capacitor pode
//    ter mudado desde que isso foi escrito).
// 4. Testar uma compra de verdade com uma conta Sandbox (App Store
//    Connect → Users and Access → Sandbox Testers).
import Capacitor
import StoreKit

@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKitPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishTransaction", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
    ]

    // productIds: lista de com.jesuscorner.app.monthly.10 etc (ver
    // storeTiers.js). Devolve preço localizado real — é isso que
    // UpgradeScreen.jsx usa pra exibir o valor certo nos chips, não o
    // `value` estático do registro.
    @objc func getProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds", String.self) else {
            call.reject("productIds required")
            return
        }
        Task {
            do {
                let products = try await Product.products(for: productIds)
                let result = products.map { product -> [String: Any] in
                    [
                        "productId": product.id,
                        "price": NSDecimalNumber(decimal: product.price).doubleValue,
                        "currencyCode": product.priceFormatStyle.currencyCode,
                    ]
                }
                call.resolve(["products": result])
            } catch {
                call.reject("Failed to fetch products: \(error.localizedDescription)")
            }
        }
    }

    // appAccountToken precisa ser um UUID — o backend (verify-apple-purchase.js)
    // usa isso pra confirmar que a compra pertence a quem está chamando.
    // FLAG: subscriptionStore.js manda o user.id do Supabase (não
    // necessariamente um UUID no formato exato que o StoreKit espera aqui —
    // conferir se precisa de conversão).
    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId required")
            return
        }
        let appAccountToken = call.getString("appAccountToken")

        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product not found: \(productId)")
                    return
                }

                var options: Set<Product.PurchaseOption> = []
                if let tokenString = appAccountToken, let uuid = UUID(uuidString: tokenString) {
                    options.insert(.appAccountToken(uuid))
                }

                let result = try await product.purchase(options: options)

                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        // NÃO chama transaction.finish() aqui — só depois que o
                        // backend confirmar a verificação (ver finishTransaction
                        // abaixo, chamado por startIOSPurchase em
                        // subscriptionStore.js), pra não perder a chance de
                        // reentrega se a verificação do servidor falhar.
                        call.resolve([
                            "transactionId": String(transaction.id),
                            "jws": verification.jwsRepresentation,
                        ])
                    case .unverified:
                        call.reject("Transaction could not be verified by StoreKit")
                    }
                case .userCancelled:
                    call.reject("user_cancelled")
                case .pending:
                    call.reject("purchase_pending")
                @unknown default:
                    call.reject("Unknown purchase result")
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    // Chamado por subscriptionStore.js só depois que /api/verify-apple-purchase
    // confirmar a compra no backend.
    @objc func finishTransaction(_ call: CAPPluginCall) {
        guard let transactionIdString = call.getString("transactionId"),
              let transactionId = UInt64(transactionIdString) else {
            call.reject("transactionId required")
            return
        }
        Task {
            for await verificationResult in Transaction.all {
                if case .verified(let transaction) = verificationResult, transaction.id == transactionId {
                    await transaction.finish()
                    call.resolve()
                    return
                }
            }
            call.reject("Transaction not found")
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                call.resolve()
            } catch {
                call.reject("Restore failed: \(error.localizedDescription)")
            }
        }
    }
}
