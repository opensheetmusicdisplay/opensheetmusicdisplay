import chai = require("chai");
import spies = require("chai-spies");
chai.use(spies);

import { IEvent, Event } from "../../src/Plugin";


describe("PluginHost's IEvent and actual implementation", () => {

    type MockHandler<T> = (data: T) => void;

    it("registers handlers", (done: MochaDone) => {
        let event: IEvent<string> = new Event<string>();
        event.on(() => undefined);
        done();
    });

    it("unregisters handlers", (done: MochaDone) => {
        let event: IEvent<string> = new Event<string>();
        let mockHandler: MockHandler<string> = () => undefined;
        event.on(mockHandler);
        event.off(mockHandler);
        done();
    });

    it("notifies registered handler when triggered", (done: MochaDone) => {
        let event: Event<string> = new Event<string>();
        let spy: any = chai.spy();
        event.on(spy);
        event.trigger("mock event");
        chai.expect(spy).to.have.been.called.once();
        chai.expect(spy).to.have.been.called.with("mock event");
        done();
    });

    it("notifies registered handler every time when triggered", (done: MochaDone) => {
        let event: Event<string> = new Event<string>();
        let spy: any = chai.spy();
        event.on(spy);
        event.trigger("mock event");
        chai.expect(spy).to.have.been.called.once();
        chai.expect(spy).to.have.been.called.with("mock event");
        event.trigger("another mock event");
        event.trigger("again a mock event");
        event.trigger("the fourth mock event");
        chai.expect(spy).to.have.been.called.exactly(4);
        chai.expect(spy).to.have.been.called.with("the fourth mock event");
        done();
    });

    it("does return the specified type", (done: MochaDone) => {
        interface CustomType {
            name: string;
            age: number;
            greet(name: string): string;
        }
        let eventString: Event<string> = new Event<string>();
        let eventNumber: Event<number> = new Event<number>();
        let eventCustom: Event<CustomType> = new Event<CustomType>();

        let spyString: any = chai.spy();
        eventString.on(spyString);
        eventString.trigger("mock event");
        chai.expect(spyString).to.have.been.called.once();
        chai.expect(spyString).to.have.been.called.with("mock event");

        let spyNumber: any = chai.spy();
        eventNumber.on(spyNumber);
        eventNumber.trigger(123456);
        chai.expect(spyNumber).to.have.been.called.once();
        chai.expect(spyNumber).to.have.been.called.with(123456);
        let spyCustom: any = chai.spy((eventArg: CustomType) => {
            chai.expect(eventArg).to.be.an("object");
            chai.expect(eventArg.age).to.be.a("number");
            chai.expect(eventArg.age).to.equal(60);
            chai.expect(eventArg.name).to.be.a("string");
            chai.expect(eventArg.name).to.equal("Max");
            chai.expect(eventArg.greet).to.be.a("function");
            chai.expect(eventArg.greet("Unit Tester")).to.equal("Hello, Unit Tester!");
        });
        eventCustom.on(spyCustom);
        eventCustom.trigger({
            age: 60,
            greet: (arg: string) => { return `Hello, ${arg}!`; },
            name: "Max",
        });
        chai.expect(spyCustom).to.have.been.called.once();
        done();
    });

    it("notifies all registered handlers when triggered", (done: MochaDone) => {
        let event: Event<string> = new Event<string>();
        let spyOne: any = chai.spy();
        let spyTwo: any = chai.spy();
        let spyThree: any = chai.spy();
        event.on(spyOne);
        event.on(spyTwo);
        event.on(spyThree);
        event.trigger("mock event");
        chai.expect(spyOne).to.have.been.called.once();
        chai.expect(spyOne).to.have.been.called.with("mock event");
        chai.expect(spyTwo).to.have.been.called.once();
        chai.expect(spyTwo).to.have.been.called.with("mock event");
        chai.expect(spyThree).to.have.been.called.once();
        chai.expect(spyThree).to.have.been.called.with("mock event");
        done();
    });

    it("doesn't notify unregistered handlers when triggered", (done: MochaDone) => {
        let event: Event<string> = new Event<string>();
        let spy: any = chai.spy();
        event.on(spy);
        event.trigger("mock event");
        chai.expect(spy).to.have.been.called.once();
        chai.expect(spy).to.have.been.called.with("mock event");
        event.off(spy);
        event.trigger("mock event");
        chai.expect(spy).to.have.been.called.once();
        done();
    });
});
